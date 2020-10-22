const Arr = require("@rhinojs/support/src/arr");
const EventEmitter = require('events');

class Global
{
    constructor()
    {
        this.data = {};
        this.__events = new EventEmitter();
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
        // Verificar se mudou
        if (this.data[key] == value) {
            return this;
        }        
        
        this.data[key] = value;

        this.__events.emit(key, value);

        return this;
    }

    /**
     * Monitorar alteracao de key.
     * 
     * @param {String} key Chave do parametro
     * @param {Function} callback Funcao a ser executada
     */
    on(key, callback)
    {
        this.__events.on(key, callback);
    }    
}

module.exports = new Global();