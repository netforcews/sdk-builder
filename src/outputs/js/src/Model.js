const Arr = require("@rhinojs/support/src/arr");

class Model
{
    /**
     * Construtor.
     */
    constructor (attrs = {})
    {
        this.$attrs = attrs;
    }

    /**
     * Retorna um atributo.
     * 
     * @param {String} key Chave do atributo
     * @param {object} vDefault Valor padrao
     */
    get(key, vDefault = null)
    {
        return Arr.get(this.$attrs, key, vDefault);
    }

    /**
     * Atribuir um atributo.
     * 
     * @param {String } key Chave do atributo
     * @param {object} value Valor do atributo
     * @returns {Model}
     */
    set(key, value)
    {
        this.$attrs[key] = value;

        return this;
    }

    /**
     * Retorna attrs array.
     * 
     * @returns {Array}
     */
    toArray()
    {
        return this.$attrs;
    }

    /**
     * Retorna attrs em json(array)
     * 
     * @returns {string}
     */
    toJson()
    {
        return JSON.stringify(this.toArray(), nnull, '\t');
    }
}

module.exports = Model;