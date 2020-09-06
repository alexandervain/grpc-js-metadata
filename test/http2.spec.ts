import * as http2 from 'http2';

const SIZE_HEADER = 'trailer-size';
const HEADER = 'trailer';

describe('http2 headers size', () => {

  const server = http2.createServer(/*{maxSendHeaderBlockLength: 128 * 1024}*/);
  server.on('stream', (req, headers) => {
    const size = headers[SIZE_HEADER] as string;
    const payload = 'X'.repeat(parseInt(size));

    req.respond(undefined, {waitForTrailers: true});
    req.on('wantTrailers', () => {
      req.sendTrailers({[HEADER]: payload});
      console.log('*********http2.spec.ts:15*********** trailers sent ', payload.length);
    });
    req.on('frameError', function() {
      console.log('*********http2.spec.ts:19*********** frameError arguments: ', arguments);
    });
    req.end();
  });

  before(() => server.listen(3000));

  after(done => server.close(done));

  it('passes', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: 63 * 1024});

    req.on('trailers', trailers => {
      console.log('*********http2.spec.ts:30*********** trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })
  });

  it('halts forever', done => {
    const session = http2.connect(`http://localhost:3000`);
    const req = session.request({[SIZE_HEADER]: 64 * 1024});

    req.on('trailers', trailers => {
      console.log('*********http2.spec.ts:30*********** trailers[HEADER].length: ', trailers[HEADER].length);
      session.close(done);
    })

    req.on('aborted', () => {
      console.log('*********http2.spec.ts:48*********** aborted ');
    })

    req.on('close', function()  {
      console.log('*********http2.spec.ts:52*********** closed ');
      console.log('*********http2.spec.ts:53*********** arguments: ', arguments);
    })

    req.on('error', () => {
      console.log('*********http2.spec.ts:56*********** error ');
    })

    req.on('frameError', () => {
      console.log('*********http2.spec.ts:60*********** frameError ');
    })
  });
});

