const { Arr } = require("@rhinojs/support");

class Global
{
    constructor()
    {
        this.data = {};
    }

    /**
     * Retorna um parametro.
     * 
     * @param {String} key Chave do parametro
     * @param {object} vDefault Valor padrao
     */
    get(key, vDefault = null)
    {
        return Arr.get(this.data, key, vDefault);
    }

    /**
     * Atribuir um parametro.
     * 
     * @param {String } key Chave do parametro
     * @param {object} value Valor do parametro
     * @returns {Client}
     */
    set(key, value)
    {
        this.data[key] = value;

        return this;
    }
}

module.exports = new Global();