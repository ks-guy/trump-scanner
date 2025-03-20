const { exec } = require('child_process');
const { createLogger } = require('../utils/logger');
const logger = createLogger('TaskKiller');

class TaskKiller {
    static async killAllTasks() {
        try {
            // Kill Node.js processes
            await this.killNodeProcesses();
            
            // Kill Docker containers if running
            await this.killDockerContainers();
            
            // Kill any hanging processes on common ports
            await this.killPortProcesses();
            
            logger.info('All tasks have been terminated successfully');
        } catch (error) {
            logger.error(`Error killing tasks: ${error.message}`);
            throw error;
        }
    }

    static killNodeProcesses() {
        return new Promise((resolve, reject) => {
            const command = process.platform === 'win32' 
                ? 'taskkill /F /IM node.exe'
                : 'pkill -f node';

            exec(command, (error) => {
                if (error) {
                    logger.warn(`No Node.js processes found or already terminated`);
                } else {
                    logger.info('Terminated all Node.js processes');
                }
                resolve();
            });
        });
    }

    static killDockerContainers() {
        return new Promise((resolve, reject) => {
            exec('docker ps -q', (error, stdout) => {
                if (error) {
                    logger.warn('No Docker containers running');
                    resolve();
                    return;
                }

                const containerIds = stdout.trim().split('\n');
                if (containerIds.length === 0 || containerIds[0] === '') {
                    logger.warn('No Docker containers running');
                    resolve();
                    return;
                }

                exec(`docker stop ${containerIds.join(' ')}`, (error) => {
                    if (error) {
                        logger.warn('Error stopping Docker containers');
                    } else {
                        logger.info('Stopped all Docker containers');
                    }
                    resolve();
                });
            });
        });
    }

    static killPortProcesses() {
        return new Promise((resolve, reject) => {
            const ports = [3000, 3306, 6379, 8080, 9000]; // Common ports used in the project
            const promises = ports.map(port => {
                return new Promise((resolve) => {
                    const command = process.platform === 'win32'
                        ? `netstat -ano | findstr :${port}`
                        : `lsof -i :${port}`;

                    exec(command, (error, stdout) => {
                        if (error) {
                            resolve();
                            return;
                        }

                        if (process.platform === 'win32') {
                            const pid = stdout.split(/\s+/)[4];
                            if (pid) {
                                exec(`taskkill /F /PID ${pid}`, () => resolve());
                            } else {
                                resolve();
                            }
                        } else {
                            const pid = stdout.split(/\s+/)[1];
                            if (pid) {
                                exec(`kill -9 ${pid}`, () => resolve());
                            } else {
                                resolve();
                            }
                        }
                    });
                });
            });

            Promise.all(promises)
                .then(() => {
                    logger.info('Cleaned up processes on common ports');
                    resolve();
                })
                .catch(reject);
        });
    }
}

module.exports = TaskKiller; 