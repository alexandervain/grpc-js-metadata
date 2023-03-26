import * as http2 from 'http2';

const SIZE_HEADER = 'trailer-size';
const HEADER = 'trailer';

describe('http2 headers size', () => {
  const MAX_SEND_HEADER_BLOCK_LENGTH = 128 * 1024;
  const server = http2.createServer({maxSendHeaderBlockLength: MAX_SEND_HEADER_BLOCK_LENGTH});
  server.on('stream', (req, headers) => {
    const size = headers[SIZE_HEADER] as string;
    const payload = 'X'.repeat(parseInt(size));

    req.respond(undefined, {waitForTrailers: true});
    req.on('wantTrailers', () => {
      req.sendTrailers({[HEADER]: payload});
      console.log('[SERVER] trailers sent ', payload.length);
    });
    req.on('frameError', function() {
      console.log('[SERVER] frameError');
    });
    req.on('close', function() {
      console.log('[SERVER] close');
    });
    req.on('error', function() {
      console.log('[SERVER] error');
    });
    req.end();
  });

  before(() => server.listen(3000));

  after(done => server.close(done));

  it('passes', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: 63 * 1024});

    req.on('trailers', trailers => {
      console.log('trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })
  });

  it('passes with 64KB', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: 64 * 1024});

    req.on('trailers', trailers => {
      console.log('trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })

    req.on('close', function()  {
      console.log('closed ');
    })
  });

  it('frameError (on server side) when header size exceeds maxSendHeaderBlockLength server settings', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: MAX_SEND_HEADER_BLOCK_LENGTH + 1});

    req.on('trailers', trailers => {
      console.log('trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })
    req.on('close', function(err)  {
      console.log('closed ', err);
    })
  });

  it('halts forever when header size > 64 KB but < maxSendHeaderBlockLength server setting', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: 65 * 1024});

    req.on('trailers', trailers => {
      console.log('trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })

    req.on('aborted', () => {
      console.log('aborted ');
    })
    req.on('close', function()  {
      console.log('closed');
    })
    req.on('error', () => {
      console.log('error ');
    })
    req.on('frameError', () => {
      console.log('frameError ');
    })
    session.on("close", () => {
      console.log(`Session: close event`);
    })
    session.on("error", (error) => {
      console.log(`response event`);
    })
    session.on("frameError", (error) => {
      console.log(`frameError event`);
    })
  });
});

