class Resource
{
    /**
     * Construtor.
     */
    constructor (client)
    {
        this.client = client;
    }

    /**
     * Alias: Retorna um parametro.
     * 
     * @param {String} key Chave do parametro
     * @param {object} vDefault Valor padrao
     */
    param(key, vDefault = null)
    {
        return this.client.param(key, vDefault);
    }

    /**
     * Alias: Atribuir um parametro.
     * 
     * @param {String } key Chave do parametro
     * @param {object} value Valor do parametro
     * @returns {Client}
     */
    setParam(key, value)
    {
        return this.client.setParam(key, value);
    }
}

module.exports = Resource;