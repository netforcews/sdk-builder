const fs = require('fs');
const path = require('path');
var rimraf = require("rimraf");
const Build = require("./Build");
const { Arr, Str } = require('@rhinojs/support');

class BuildJS extends Build
{
    /**
     * Executar o build JS.
     */
    build() {        
        // Carregar parametros
        var version       = this.config('build.version',                 '0.0.0');
        var name          = this.config('build.config.js.name',          'nws-sdk');
        var internal_name = this.config('build.config.js.internal_name', 'nws');
        var keyword       = this.config('build.config.js.keyword',       'netforce');
        var github        = this.config('build.config.js.github',        'git@github.com:netforcews/sdk-js.git');

        // Preparar diretorios
        var pathBase = this.getPath('js', { version: this.config('build.version', '0.0.0') });

        // Se pasta existir deve limpar
        if (fs.existsSync(pathBase)) {
            rimraf.sync(pathBase);
        }

        var pathModels    = path.resolve(pathBase, 'src', 'Models');
        var pathResources = path.resolve(pathBase, 'src', 'Resources');
        var pathServices  = path.resolve(pathBase, 'src');

        // Arquivos /root
        this.copyStub(__dirname + '/js/.gitignore',         pathBase + '/.gitignore');
        this.copyStub(__dirname + '/js/.babelrc',           pathBase + '/.babelrc');
        this.copyStub(__dirname + '/js/package.json',       pathBase + '/package.json', {
            version  : version,
            name     : name,
            keyword  : keyword,
            github   : github,
        });
        this.copyStub(__dirname + '/js/webpack.config.js',  pathBase + '/webpack.config.js', { 'version'       : version });
        this.copyStub(__dirname + '/js/browser.js',         pathBase + '/browser.js',        { 'internal_name' : internal_name });

        // Arquivos /src/Base
        this.copyStub(__dirname + '/js/src/Client.js',      pathBase + '/src/Base/Client.js', { 'version' : version });
        this.copyStub(__dirname + '/js/src/Global.js',      pathBase + '/src/Base/Global.js');
        this.copyStub(__dirname + '/js/src/Consts.js',      pathBase + '/src/Base/Consts.js', {
            'env_production' : this.config('build.endpoints.production', '???'),
            'env_sandbox'    : this.config('build.endpoints.sandbox', '???'),
            'env_local'      : this.config('build.endpoints.local', '???'),
        });
        this.copyStub(__dirname + '/js/src/Model.js',      pathBase + '/src/Base/Model.js');
        this.copyStub(__dirname + '/js/src/Resource.js',   pathBase + '/src/Base/Resource.js');

        // Models /src/Models
        var keys = Object.keys(this.models);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const model = this.models[key];
            this.buildModel(pathModels, model);
        }

        // Models /src/Resources
        //foreach ($this->resources as $resource) {
        //    $this->buildJsResource($pathResources, $resource);
        //}

        // Services /src
        var services = [];
        //foreach ($this->services as $service) {
        //    $services[] = $this->buildJsService($pathServices, $service);
        //}

        this.copyIndex(services, pathBase);
    }

    /**
     * Copilar model.
     * 
     * @param {String} pathModels Path base dos models.
     * @param {Object} model Definição do model
     */
    buildModel(pathModels, model)
    {
        var className = Str.studly(Arr.get(model, 'model', ''));

        this.copyStub(__dirname + '/js/src/stubs/Model.txt', pathModels + '/' + className + '.js', {
            class: className
        });
    }

    /**
     * gerar arquivo index.js.
     * 
     * @param {Array} services Lista de servicos gerados
     * @param {String} pathBase Path base do output
     */
    copyIndex(services, pathBase)
    {
        var code = '';

        for (let i = 0; i < services.length; i++) {
            const srv = services[i];

            code += (i > 0) ? ",\r\n" : '';
            code += "    '" + srv + "': require('./src/" + srv + "')";
        }

        this.copyStub(__dirname + '/js/index.js',      pathBase + '/index.js', {
            'services' : code,
        });
    }
}

module.exports = BuildJS;