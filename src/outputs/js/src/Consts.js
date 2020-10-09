module.exports = {
    /**
     * Envs
     */
    envProduction : 'production',
    envSandbox    : 'sandbox',
    envLocal      : 'local',

    /**
     * Endpoints
     */
    endpoints: {
        production : '{{env_production}}',
        sandbox    : '{{env_sandbox}}',
        local      : '{{env_local}}',
    }
};