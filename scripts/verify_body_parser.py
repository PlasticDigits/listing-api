#!/usr/bin/env python3
"""Check compressed JSON parsing in an isolated loopback-only child (under 15s)."""
import gzip
import http.client
import json
import os
from pathlib import Path
import selectors
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
# Express exports body-parser's json middleware. Keep the default options used
# by src/server.ts, with an echo route that exposes the parsed fixture body.
CHILD = r'''
const express = require('express');
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({status: 'ok'}));
app.post('/probe', (req, res) => res.json(req.body));
const server = app.listen(0, '127.0.0.1', () => {
  process.stdout.write(JSON.stringify({port: server.address().port}) + '\n');
});
setTimeout(() => process.exit(2), 9000).unref();
process.on('SIGTERM', () => server.close(() => process.exit(0)));
'''


def verify():
    child = subprocess.Popen(
        ['node', '-e', CHILD], cwd=ROOT,
        env={'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'NODE_ENV': 'test'},
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(child.stdout, selectors.EVENT_READ)
            if not selector.select(timeout=3):
                raise AssertionError('isolated parser readiness deadline')
        ready = json.loads(child.stdout.readline(128))
        port = ready.get('port')
        if type(port) is not int or not 1 <= port <= 65535:
            raise AssertionError('invalid loopback listener receipt')

        def request(method, path, body=None, encoding=None):
            connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
            headers = {'Content-Type': 'application/json'} if body is not None else {}
            if encoding:
                headers['Content-Encoding'] = encoding
            try:
                connection.request(method, path, body=body, headers=headers)
                response = connection.getresponse()
                result = response.read(1024)
                if response.status != 200:
                    raise AssertionError('fixture request rejected')
                return json.loads(result)
            finally:
                connection.close()

        ordinary = b'{"a":1}'
        assert request('POST', '/probe', ordinary) == {'a': 1}
        compressed = gzip.compress(ordinary, mtime=0)
        assert request('POST', '/probe', compressed, 'gzip') == {'a': 1}
        # Vendor regression GHSA-27r3-jxmh-p828: a finished valid gzip frame,
        # a zero byte, then 100KiB of junk can raise an uncaught late error.
        trailing = compressed + b'\0' + b'X' * (100 * 1024)
        assert request('POST', '/probe', trailing, 'gzip') == {'a': 1}
        time.sleep(0.25)  # Let a decoder's late error surface before health.
        if child.poll() is not None:
            raise AssertionError('parser child terminated after trailing bytes')
        assert request('GET', '/health') == {'status': 'ok'}
        print(json.dumps({'ordinary_json': 'passed', 'gzip_json': 'passed',
                          'gzip_trailing_corrupt_bytes': 'passed',
                          'subsequent_health': 'passed', 'loopback_only': True}))
    finally:
        if child.poll() is None:
            child.terminate()
        try:
            child.communicate(timeout=1)
        except subprocess.TimeoutExpired:
            child.kill()
            child.communicate(timeout=1)


if __name__ == '__main__':
    verify()
