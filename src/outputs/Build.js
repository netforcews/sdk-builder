const fs = require('fs');
const glob = require('glob');
const path = require('path');
const yaml = require('yaml');
const { Arr, Str, Obj } = require('@rhinojs/support');
const { parse } = require('querystring');

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

        this.defs = {
            strVar(key) {
                return '${' + key + '}';
            },

            varName(key) {
                return key;
            },

            ns(part) {
                return part + '/';
            },

            newObj(code = '') {
                return '{' + code + '}';
            },

            keyValue(key, val) {
                return "'" + key + "': " + val + ",";
            },

            returnVar: 'return ret;',

            fileExt: '.js',

            returnArrGetBool(key) {
                return "return (Arr.get(ret, '" + key + "') == true);";
            }
        };
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
     * @param {Object} params Lista de parametros gerais
     */
    buildModel(pathModels, model, pathStubs, params = {})
    {
        var className = Str.studly(Arr.get(model, 'model', ''));

        this.copyStub(pathStubs + '/Model.txt', pathModels + '/' + className + this.defs.fileExt, Obj.merge(params, {
            class: className,
        }));
    }

    /**
     * Copilar resources.
     * 
     * @param {String} pathResources Path base dos resources.
     * @param {Object} resource Definição do resource
     * @param {String} pathStubs Path base dos stubs
     * @param {Object} params Lista de parametros gerais
     */
    buildResource(pathResources, resource, pathStubs, params = {})
    {
        var className = Str.studly(Arr.get(resource, 'resource', ''));
        var actions = Arr.get(resource, 'actions', {});

        this.copyStub(pathStubs + '/Resource.txt', pathResources + '/' + className + this.defs.fileExt, Obj.merge(params, {
            class      : className,
            uses       : this.__buildClassUses(actions, {}, '../', pathStubs),
            properties : '',
            methods    : this.__buildClassActions(actions, pathStubs, params),
        }));
    }

    /**
     * Copilar services.
     * 
     * @param {String} pathServices Path base dos services.
     * @param {Object} service Definição do service
     * @param {String} pathStubs Path base dos stubs
     * @param {Object} params Lista de parametros gerais
     */
    buildService(pathServices, service, pathStubs, params = {})
    {
        var className = Str.studly(Arr.get(service, 'service', '')) + 'Client';
        var resources = this.__getDefResources(service);
        var actions   = Arr.get(service, 'actions', {});

        this.copyStub(pathStubs + '/Service.txt', pathServices + '/' + className + this.defs.fileExt, Obj.merge(params, {
            class       : className,
            uses        : this.__buildClassUses(actions, resources, './', pathStubs),
            constructor : this.__buildClassContructor(resources, pathStubs, params),
            properties  : this.__buildClassProperties(resources, pathStubs, params),
            methods     : this.__buildClassActions(actions, pathStubs, params),
        }));

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
    __buildClassContructor(properties, pathStubs, params)
    {
        var $this = this;
        var code = '';

        var ns = Arr.get(params, 'ns', '');

        Arr.each(properties, (key, prop) => {
            var code_prop = $this.getStub(pathStubs + '/Constructor.txt', {
                name  : prop.id,
                ns    : ns + $this.defs.ns('Resources'),
                class : prop.class,
            });

            code += "\r\n" + code_prop;
        });

        return code;
    }

    /**
     * Compilar propriedades.
     */
    __buildClassProperties(properties, pathStubs, params)
    {
        var $this = this;
        var code = '';

        var ns = Arr.get(params, 'ns', '');

        Arr.each(properties, (key, prop) => {
            var code_prop = $this.getStub(pathStubs + '/Property.txt', Obj.merge(params, {
                name  : prop.id,
                ns    : ns + $this.defs.ns('Resources'),
                class : prop.class,
            }));

            code += code_prop;
        });

        return code;
    }

    /**
     * Compilar actions.
     */
    __buildClassActions(actions, pathStubs, params)
    {
        var $this = this;
        var code = '';

        Arr.each(actions, (act_name, act_info) => {
            
            var code_action = $this.getStub(pathStubs + '/Action.txt', {
                name        : act_name,
                args        : $this.__buildActionArgs(act_info),
                desc        : act_info.desc ? act_info.desc : ('Action ' + act_name),
                method      : act_info.method,
                uri         : act_info.uri,
                code_uri    : $this.__buildActionCodeUri(act_info),
                code_data   : $this.__buildActionCodeData(act_info),
                code_query  : $this.__buildActionCodeQuery(act_info),
                code_checks : '',
                code_afters : $this.__buildActionCodeEventsAfter(act_info, pathStubs),
                code_return : $this.__buildActionCodeReturn(act_info, pathStubs, params),
            });

            code += code_action;
        });

        return code;
    }

    /**
     * Compilar action args.
     */
    __buildActionArgs(action)
    {
        var $this = this;

        if (!action.args) {
            return '';
        }

        var code = '';

        Arr.each(action.args, (arg_name, arg_info) => {
            code += (code != '') ? ', ' : '';
            code += $this.defs.varName(arg_name);

            var def = Arr.get(arg_info, 'default');

            if (def) {
                code += ' = ';

                if (def1 === true) {
                    code += 'true';
                } else if (def === false) {
                    code += 'false';
                } else {
                    code += def;
                }
            }

        });

        return code;
    }

    /**
     * Compilar action code uri.
     */
    __buildActionCodeUri(action)
    {
        var $this = this;
        var uri = action.uri;

        if (!action.args) {
            return uri;
        }

        // Traduzir params names
        Arr.each(action.args, (arg_name, arg_info) => {
            if ((arg_info != null) && (arg_info.type && (arg_info.type == 'param'))) {
                uri = Str.replaceAll('{' + arg_name + '}', $this.defs.strVar(arg_name), uri);
            }
        });

        return uri;
    }

    /**
     * Compilar action code data.
     */
    __buildActionCodeData(action)
    {
        if (!action.args) {
            return this.defs.newObj();
        }

        var lenPrefix = 12;
        var code  = '';
        var $this = this;
        var prefix = ('').padEnd(lenPrefix, ' ');

        var ret = Arr.each(action.args, (arg_name, arg_info) => {
            var type = Arr.get(arg_info, 'type', 'data');

            if (type == 'unique') {
                return $this.defs.varName(arg_name);
            }

            if (type == 'data') {
                code += '\r\n' + prefix;
                code += $this.defs.keyValue(arg_name, $this.defs.varName(arg_name));
            }

        });

        if (ret) {
            return ret;
        }

        code += (code != '') ? "\r\n" + (('').padEnd(lenPrefix - 4, ' ')) : '';

        return this.defs.newObj(code);
    }

    /**
     * Compilar action code query.
     */
    __buildActionCodeQuery(action)
    {
        var $this = this;

        if (!action.args) {
            return '';
        }

        var query = [];

        var ret = Arr.each(action.args, (arg_name, arg_info) => {
            var type = Arr.get(arg_info, 'type', 'data');
            if (type == 'query') {
                query.push($this.defs.keyValue(arg_name, $this.defs.varName(arg_name)));
            }

            if (type == 'query_unique') {
                return ', ' + $this.defs.varName(arg_name);
            }
        });

        if (ret) {
            return ret;
        }

        if (query.length == 0) {
            return '';
        }

        return ', ' + this.defs.newObj(query.join(','));
    }

    /**
     * Compilar action code events after.
     */
    __buildActionCodeEventsAfter(action, pathStubs)
    {
        var afters = Arr.get(action, 'events.after');
        if (!afters) {
            return '';
        }

        var code = '';
        var $this = this;

        Arr.each(afters, (param_key, ret_key) => {
            var after_stub = (ret_key == null) ? '/EventAfterNull.txt' : '/EventAfter.txt';

            var code_after = $this.getStub(pathStubs + after_stub, {
                param_key : param_key,
                ret_key   : ret_key,
            });

            code += "\r\n" + code_after;
        });

        return code;
    }

    /**
     * Compilar action code return.
     */
    __buildActionCodeReturn(action, pathStubs, params)
    {
        var code = this.defs.returnVar;

        if (!action.return) {
            return code;
        }

        var ret = action.return;
        var ret_type     = Arr.get(ret, 'type', 'direct');
        var ret_resource = Arr.get(ret, 'resource', '');
        var ret_value     = Arr.get(ret, 'value', '');

        switch (ret_type) {

            case 'model':
                code = this.getStub(pathStubs + '/ReturnModel.txt', Obj.merge(params, {
                    class: Str.studly(ret_resource),
                }));
                break;

            case 'boolean':
                if (ret_value === true) {
                    code = 'return true;';
                } else if (ret_value === false) {
                    code = 'return false;';
                } else {
                    var parts = ret_value.split('.');
                    if (parts[0] == 'ret') {
                        parts = parts.slice(1);
                    }
                    parts = parts.join('.');

                    code = this.defs.returnArrGetBool(parts);
                }
                break;
        }

        return code;
    }
}

module.exports = Build;