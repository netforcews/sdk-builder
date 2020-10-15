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

        Arr.each(params, (key, param) => {
            ret = Str.replaceAll('\\[' + key + '\\]', param, ret);
        });

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
        Arr.each(params, (key, param) => {
            buffer = Str.replaceAll("{{" + key + "}}", param, buffer);
        });

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

    /**
     * Copilar models.
     * 
     * @param {String} pathModels Path base dos models.
     * @param {Object} model Definição do model
     * @param {String} pathStubs Path base dos stubs
     */
    buildModel(pathModels, model, pathStubs)
    {
        var className = Str.studly(Arr.get(model, 'model', ''));

        this.copyStub(pathStubs + '/Model.txt', pathModels + '/' + className + '.js', {
            class: className
        });
    }

    /**
     * Copilar resources.
     * 
     * @param {String} pathResources Path base dos resources.
     * @param {Object} resource Definição do resource
     * @param {String} pathStubs Path base dos stubs
     */
    buildResource(pathResources, resource, pathStubs)
    {
        var className = Str.studly(Arr.get(resource, 'resource', ''));
        var actions = Arr.get(resource, 'actions', {});

        this.copyStub(pathStubs + '/Resource.txt', pathResources + '/' + className + '.js', {
            class   : className,
            uses    : this.__buildClassUses(actions, {}, '../', pathStubs),
            methods : '', //????????????????????????????????
        });
    }

    /**
     * Copilar services.
     * 
     * @param {String} pathServices Path base dos services.
     * @param {Object} service Definição do service
     * @param {String} pathStubs Path base dos stubs
     */
    buildService(pathServices, service, pathStubs)
    {
        var className = Str.studly(Arr.get(service, 'service', '')) + 'Client';
        var resources = this.__getDefResources(service);
        var actions   = Arr.get(service, 'actions', {});

        this.copyStub(pathStubs + '/Service.txt', pathServices + '/' + className + '.js', {
            class       : className,
            uses        : this.__buildClassUses(actions, resources, './', pathStubs),
            constructor : this.__buildClassContructor(resources, pathStubs),
            methods     : '', //????????????????????????????????
        });

        return className;
    }

    /**
     * Retorna a lista de recursos.
     * 
     * @param {Object} def Objeto de definição
     * @returns {Object}
     */
    __getDefResources(def)
    {
        var lista = {};
        var res  = Arr.get(def, 'resources', {});

        Arr.each(res, (res_key, res_value) => {
            const res_class = Str.studly(res_value);            

            lista[res_key] = {
                id    : res_key,
                class : res_class,
            };
        });
        
        return lista;
    }

    /**
     * Compilar uses.
     */
    __buildClassUses(actions, properties, pathNS, pathStubs)
    {
        var code = '';

        //-----------------------------------------------------------------------
        // Model das ações
        //-----------------------------------------------------------------------
        Arr.each(actions, (key, action) => {
            var ret_type = Arr.get(action, 'return.type', 'direct');
            if (ret_type == 'model') {
                var ret_model = Arr.get(action, 'return.resource', '');

                var code_prop = this.getStub(pathStubs + '/Uses.txt', {
                    ns    : pathNS + 'Models/',
                    const : Str.studly(ret_model) + 'Model',
                    class : Str.studly(ret_model),
                });

                code += "\r\n" + code_prop;
            }
        });

        //-----------------------------------------------------------------------
        // Rescursos
        //-----------------------------------------------------------------------
        Arr.each(properties, (key, prop) => {
            var code_prop = this.getStub(pathStubs + '/Uses.txt', {
                ns    : pathNS + 'Resources/',
                const : prop.class,
                class : prop.class,
            });

            code += "\r\n" + code_prop;
        });

        return code;
    }

    /**
     * Compilar constructors.
     */
    __buildClassContructor(properties, pathStubs)
    {
        var $this = this;
        var code = '';

        Arr.each(properties, (key, prop) => {
            var code_prop = $this.getStub(pathStubs + '/Constructor.txt', {
                name  : prop.id,
                ns    : 'Resources/',
                class : prop.class,
            });

            code += "\r\n" + code_prop;
        });

        return code;
    }
}

module.exports = Build;