// Clusters

const cluster = require('cluster');
const os = require('os');


// Only fork into workers on the master thread
if (cluster.isMaster) {
    const cpus = os.cpus().length;
    console.log(`Clustering to ${cpus} CPUs`);
    for(let i = 0; i < cpus; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code) => {
        if (code !== 0 && !worker.exitedAfterDisconnect) {
            console.log('Worker crashed. Starting a new one.');
            cluster.fork();
        }

    });

    // signals for workers to restart when process was killed
    process.on('SIGUSR2', () => {
        const workers = Object.keys(cluster.workers);
        console.log(`Workers: ${workers}`);

        const restartWorker = workerIndex => {
            if(workerIndex >= workers.length) return;
            const worker = cluster.workers[workers[workerIndex]];
            console.log(`Stoping worker: ${worker.process.pid}`);
            worker.disconnect(); // disconnect worker
            worker.on('exit', () => {
                // exitedAfterDisconnect is true if the worker exited due to .kill() or .disconnect().
                if (!worker.exitedAfterDisconnect) return;
                // when the worker was disconnected a new one can be started
                const newWorker = cluster.fork();
                newWorker.on('listening', () => {
                    // once the worker is listening, next can be restarted
                    restartWorker(workerIndex + 1);
                });
            })
        };
        restartWorker(0);
    });
} else {
    require('./app');
}