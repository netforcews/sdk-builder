const axios  = require('axios');
const Consts = require('./Consts');
const Global = require('./Global');
const Arr = require("@rhinojs/support/src/arr");

class Client
{
    /**
     * Construtor.
     */
    constructor (opts)
    {
        var $this = this;

        this.client  = this; // Alias to this.

        this.version = '{{version}}';
        this.params  = {};
        this.options = {
            env: Consts.envProduction,
            global_token: true,
        };
        Object.assign(this.options, opts);

        // Verificar se deve heardar o token do contexto global
        var globalToken = null;
        if (this.option('global_token')) {
            globalToken = Global.get('auth.accessToken');

            Global.on('auth.accessToken', (value) => {
                $this.setAccessToken(value);
            });
        }        

        // Verificar se token foi informado ou recuperado do contexto
        this.setAccessToken(this.option('access_token', globalToken));
    }

    /**
     * Retorna um option.
     * 
     * @param {String} key Chave do parametro
     * @param {object} vDefault Valor padrao
     */
    option(key, vDefault = null)
    {
        return Arr.get(this.options, key, vDefault);
    }

    /**
     * Retorna um parametro.
     * 
     * @param {String} key Chave do parametro
     * @param {object} vDefault Valor padrao
     */
    param(key, vDefault = null)
    {
        return Arr.get(this.params, key, vDefault);
    }

    /**
     * Atribuir um parametro.
     * 
     * @param {String } key Chave do parametro
     * @param {object} value Valor do parametro
     * @returns {Client}
     */
    setParam(key, value)
    {
        this.params[key] = value;

        if (key == 'accessToken') {
            Global.set('auth.accessToken', value);
        }

        return this;
    }

    /**
     * Alias: para atribuir o access_token.
     * 
     * @param {string} token Token de acesso
     * @returns {Client}
     */
    setAccessToken(token)
    {
        return this.setParam('accessToken', token);
    }

    /**
     * Retorna o access_token.
     * 
     * @returns {string}
     */
    getAccessToken()
    {
        return this.param('accessToken');
    }

    /**
     * Mudar env para sandbox.
     * 
     * @returns {Client}
     */
    sandbox()
    {
        this.setParam('env', Consts.envSandbox);

        return this;
    }

    /**
     * Mudar env para local.
     * 
     * @param {String} customEndpoint
     * @returns {Client}
     */
    local(customEndpoint = null)
    {
        this.setParam('env', Consts.envLocal);

        if (customEndpoint) {
            Consts.endpoints.local = customEndpoint;
        }

        return this;
    }

    /**
     * Mudar env para production.
     * 
     * @returns {Client}
     */
    production()
    {
        this.setParam('env', Consts.envProduction);

        return this;
    }    

    /**
     * Retorna a versão do SDK.
     * 
     * @returns {String}
     */
    getVersion()
    {
        return this.version;
    }

    /**
     * Retorna a URL para acao.
     * 
     * @param {String} part Parte da URL
     * @returns {String}
     */
    getUrl(part)
    {
        var env = this.param('env', this.option('env', Consts.envProduction));
        if (typeof Consts.endpoints[env] != 'string') {
            throw new Error("ENV [" + env + "] nao configurado");
        }

        var base = Consts.endpoints[env];
        part = part.trim();

        return (part != '') ? base + '/' + part : base;
    }

    /**
     * Fazer requisição ajax.
     * 
     * @param {String} method Metodo da requisicao
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} headers Informacoes para o header
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async request(method, part, params = {}, headers = {}, queryInPost = {})
    {
        method = method.toLowerCase();

        var hdrs = {
            'Cache-Control': 'no-cache'
        };
        Object.assign(hdrs, headers);

        var req = {
            method: method,
            url: this.getUrl(part),
            headers: hdrs
        };

        // Tratar accesstoken
        if (this.getAccessToken()) {
            req.headers['Authorization'] = this.getAccessToken();
        }

        if ((method == 'post') || (method == 'put')) {
            req.data = params;
            req.params = queryInPost;
        } else {
            req.params = params;
        }

        var res = await axios(req);

        // Tratar error
        if (res.data.error) {
            throw res.data.error.message;
        }

        return res.data;
    }

    /**
     * Fazer requisição ajax passando JSON.
     * 
     * @param {String} method Metodo da requisicao
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async requestJson(method, part, params = {}, queryInPost = {})
    {
        var headers = {
            'Content-Type': 'application/json'
        };

        return await this.request(method, part, params, headers, queryInPost);
    }

    /**
     * Executar acao GET.
     * 
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async get(part, params = {}, queryInPost = {})
    {
        return await this.requestJson('get', part, params, queryInPost);
    }

    /**
     * Executar acao POST.
     * 
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async post(part, params = {}, queryInPost = {})
    {
        return await this.requestJson('post', part, params, queryInPost);
    }

    /**
     * Executar acao PUT.
     * 
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async put(part, params = {}, queryInPost = {})
    {
        return await this.requestJson('put', part, params, queryInPost);
    }

    /**
     * Executar acao DELETE.
     * 
     * @param {String} part Part da url
     * @param {Object} params Parametros da requisicao
     * @param {Object} queryInPost Query quando POST ou PUT
     * @returns {any}
     */
    async delete(part, params = {}, queryInPost = {})
    {
        return await this.requestJson('delete', part, params, queryInPost);
    }
}

module.exports = Client;