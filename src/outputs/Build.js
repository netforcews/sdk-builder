const fs = require('fs');
const glob = require('glob');
const path = require('path');
const yaml = require('yaml');
const { Arr, Str } = require('@rhinojs/support');

class Build
{
    /**
     * Construtor do Build.
     * 
     * @param {Object} cmd Command do console
     * @param {Object} prj Definições do projeto
     * @param {Object} opts Opções de configuração
     */
    constructor (cmd, prj, opts = {}) {
        this.cmd = cmd;
        this.project = prj;
        this.options = opts;

        this._loadDefs();
    }

    /**
     * Executar BUILD.
     */
    build() {
        throw "Build não implementado";
    }

    /**
     * Retorna um parametro do projeto.
     * 
     * @param {String} key Chave do parametro
     * @param {Object} def Valor padrao
     * @returns {Object}
     */
    config(key, def = null)
    {
        return Arr.get(this.project, key, def);
    }

    /**
     * Retorna um parametro do option.
     * 
     * @param {String} key Chave do parametro
     * @param {Object} def Valor padrao
     * @returns {Object}
     */
    option(key, def = null)
    {
        return Arr.get(this.options, key, def);
    }

    /**
     * Retorna o path base para gerar o codigo.
     * 
     * @param {String} outId Output name
     * @param {Object} params Lista de parametros
     */
    getPath(outId, params = {})
    {
        var prjPath = this.option('projectPath', '??');
        var outPath = this.config('build.config.' + outId + '.outputPath', '??');

        var ret = path.resolve(prjPath, outPath);

        var keys = Object.keys(params);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            ret = Str.replaceAll('\\[' + key + '\\]', params[key], ret);
        }

        return ret;
    }

    /**
     * Copiar e tratar arquivo slug.
     * 
     * @param {String} sourceFile Arquivo slug original
     * @param {String} targetFile Arquivo destino
     * @param {Object} params Lista de parametros
     * @returns {Boolean}
     */
    copyStub(sourceFile, targetFile, params = {})
    {
        var buffer = this.getStub(sourceFile, params);

        // Forçar criar diretório
        var pathFile = path.dirname(targetFile);
        if (!fs.existsSync(pathFile)) {
            fs.mkdirSync(pathFile, { recursive: true });
        }

        buffer = this.otimizarLinhas(buffer);

        fs.writeFileSync(targetFile, buffer);

        return true;
    }

    /**
     * Carregar e tratar arquivo slug.
     * 
     * @param {String} sourceFile Arquivo slug original
     * @param {Object} params Lista de parametros
     * @returns {String}
     */
    getStub(sourceFile, params = {})
    {
        if (!fs.existsSync(sourceFile)) {
            throw "Stub [" + sourceFile + "] não encontrado";
        }

        var buffer = fs.readFileSync(sourceFile).toString();

        // Fazer trocas
        var keys = Object.keys(params);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            buffer = Str.replaceAll("{{" + key + "}}", params[key], buffer);
        }

        return buffer;
    }

    /**
     * Optimizar linhas duplas;
     * @param {String} buffer Codigo original
     * @returns {String}
     */
    otimizarLinhas(buffer)
    {
        var linhas = buffer.split("\r\n");
        var ret = [];

        var enter = false;
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            if (!(enter && (linha.trim() == ''))) {
                ret.push(linha);
            }

            enter = (linha.trim() == '');
        }

        return ret.join("\r\n");
    }

    /**
     * Carregar definições dos arquivos do projeto.
     */
    _loadDefs()
    {
        this.models    = this._loadFiles(path.resolve(this.options.projectPath, 'models'), 'model');
        this.resources = this._loadFiles(path.resolve(this.options.projectPath, 'resources'), 'resource');
        this.services  = this._loadFiles(path.resolve(this.options.projectPath, 'services'), 'service');
    }

    /**
     * Carregar lista de arquivos de um tipo de recurso.
     * 
     * @param {String} pathFiles Diretorio base dos recursos
     * @param {String} attrKey Chave do recurso
     * @returns {Array}
     */
    _loadFiles(pathFiles, attrKey)
    {
        var list = {};

        var ret = glob.sync(pathFiles + '/*.yml');
        for (let i = 0; i < ret.length; i++) {
            const item = ret[i];
            var yml = yaml.parse(fs.readFileSync(item).toString());
            if (!yml[attrKey]) {
                continue;
            }

            var key = yml[attrKey];
            list[key] = yml;
        }

        return list;
    }
}

module.exports = Build;