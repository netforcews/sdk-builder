const { Arr, Str } = require('@rhinojs/support');
const fs = require('fs');
const path = require('path');
var rimraf = require("rimraf");
const Build = require("./Build");

class BuildPHP extends Build
{
    /**
     * Construtor do Build.
     * 
     * @param {Object} cmd Command do console
     * @param {Object} prj Definições do projeto
     * @param {Object} opts Opções de configuração
     */
    constructor (cmd, prj, opts = {}) {
        super(cmd, prj, opts);

        this.defs = {
            strVar(key) {
                return '$' + key;
            },

            varName(key) {
                return '$' + key;
            },

            ns(part) {
                return '\\' + part + '\\';
            },

            newObj(code = '') {
                return '[' + code + ']';
            },

            keyValue(key, val) {
                return "'" + key + "'=> " + val + ",";
            },

            returnVar: 'return $ret;',

            fileExt: '.php',

            returnArrGetBool(key) {
                return "return (Arr::get($ret, '" + key + "') == true);";
            }
        };
    }

    /**
     * Executar o build PHP.
     */
    build() {
        var $this = this;

        // Carregar parametros
        var version       = this.config('build.version',                 '0.0.0');
        var name          = this.config('build.config.php.name',         'netforce/sdk-php');
        var description   = this.config('build.config.php.description',  'NetForce SDK PHP');
        var keyword       = this.config('build.config.php.keyword',      'netforce');
        var ns            = this.config('build.config.php.namespace',    'NetForce\Sdk');

        // Preparar diretorios
        var pathBase = this.getPath('php', { version: this.config('build.version', '0.0.0') });
        var pathStubs = __dirname + '/php/src/stubs';

        // Se pasta existir deve limpar
        if (fs.existsSync(pathBase)) {
            rimraf.sync(pathBase);
        }

        var pathModels    = path.resolve(pathBase, 'src', 'Models');
        var pathResources = path.resolve(pathBase, 'src', 'Resources');
        var pathServices  = path.resolve(pathBase, 'src');

        // Arquivos /root
        //this.copyStub(__dirname + '/php/.gitignore',        pathBase + '/.gitignore');
        this.copyStub(__dirname + '/php/composer.json',     pathBase + '/composer.json', {
            ns : Str.replaceAll('\\\\', '\\\\', ns),
            version,
            name,
            description,
            keyword,
        });

        // Arquivos /src/Base
        this.copyStub(__dirname + '/php/src/Client.txt',     pathBase + '/src/Base/Client.php', {
            ns             : ns,    
            version        : version,
            env_production : this.config('build.endpoints.production', '???'),
            env_sandbox    : this.config('build.endpoints.sandbox', '???'),
            env_local      : this.config('build.endpoints.local', '???'),
        });
        this.copyStub(__dirname + '/php/src/Response.txt',   pathBase + '/src/Base/Response.php', { ns });
        this.copyStub(__dirname + '/php/src/Resource.txt',   pathBase + '/src/Base/Resource.php', { ns });
        this.copyStub(__dirname + '/php/src/Model.txt',      pathBase + '/src/Base/Model.php',    { ns });

        // Models /src/Models
        Arr.each(this.models, (key, model) => {
            $this.buildModel(pathModels, model, pathStubs, { ns });
        });
        
        // Resources /src/Resources
        Arr.each(this.resources, (key, resource) => {
            $this.buildResource(pathResources, resource, pathStubs, { ns });
        });
        
        // Services /src
        var services = [];
        Arr.each(this.services, (key, service) => {
            services.push($this.buildService(pathServices, service, pathStubs, { ns }));
        });
    }
}

module.exports = BuildPHP;