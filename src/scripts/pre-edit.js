const TaskKiller = require('./kill_tasks');
const AutoAccept = require('./auto_accept');
const { createLogger } = require('../utils/logger');
const logger = createLogger('PreEditHook');

async function runPreEditHook() {
    try {
        logger.info('Running pre-edit hook...');
        
        // Kill all running tasks
        await TaskKiller.killAllTasks();
        
        // Accept all changes
        await AutoAccept.acceptAllChanges();
        
        logger.info('Pre-edit hook completed successfully');
    } catch (error) {
        logger.error(`Pre-edit hook failed: ${error.message}`);
        process.exit(1);
    }
}

// Run the hook
runPreEditHook(); 