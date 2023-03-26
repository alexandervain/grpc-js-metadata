import * as loader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';

describe('big metadata response halting problem', function () {

  this.timeout(5000);

  const packageDef: any = grpc.loadPackageDefinition(loader.loadSync(require.resolve('../proto/service.proto'), {keepCase: false}));
  const client = new packageDef.com.wix.Service('localhost:3001', grpc.credentials.createInsecure());

  let server: grpc.Server;

  before(done => {
    server = new grpc.Server();
    server.bindAsync('0.0.0.0:3001', grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        done(err);
      } else {
        server.addService(packageDef.com.wix.Service.service, {
          Ping(call: grpc.ServerUnaryCall<{ metadataSize: number }, {}>, callback: grpc.sendUnaryData<{}>) {
            const metadata = new grpc.Metadata();
            metadata.add('H', 'X'.repeat(call.request.metadataSize));
            callback(null, {}, metadata);
          }
        });
        server.start();
        done();
      }
    });
  });

  after(() => server.forceShutdown());

  it('passes', done => {
    client.Ping({metadataSize: 63 * 1024}, done);
  });

  it('now passes (halted previously in https://github.com/grpc/grpc-node/issues/1533)', done => {
    client.Ping({metadataSize: 64 * 1024}, done);
  });

  it('now halts (with metadata size > 64KB)', done => {
    client.Ping({metadataSize: 65 * 1024}, done);
  });
});
