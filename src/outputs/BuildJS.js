const Arr = require('@rhinojs/support/src/arr');
const fs = require('fs');
const path = require('path');
var rimraf = require("rimraf");
const Build = require("./Build");

class BuildJS extends Build
{
    /**
     * Executar o build JS.
     */
    build() {
        var $this = this;

        // Carregar parametros
        var version       = this.config('build.version',                 '0.0.0');
        var name          = this.config('build.config.js.name',          'nws-sdk');
        var internal_name = this.config('build.config.js.internal_name', 'nws');
        var keyword       = this.config('build.config.js.keyword',       'netforce');
        var github        = this.config('build.config.js.github',        'git@github.com:netforcews/sdk-js.git');

        // Preparar diretorios
        var pathBase = this.getPath('js', { version: this.config('build.version', '0.0.0') });
        var pathStubs = __dirname + '/js/src/stubs';

        // Se pasta existir deve limpar
        if (fs.existsSync(pathBase)) {
            rimraf.sync(pathBase);
        }

        var pathModels    = path.resolve(pathBase, 'src', 'Models');
        var pathResources = path.resolve(pathBase, 'src', 'Resources');
        var pathServices  = path.resolve(pathBase, 'src');

        // Arquivos /root
        //this.copyStub(__dirname + '/js/.gitignore',         pathBase + '/.gitignore');
        this.copyStub(__dirname + '/js/.babelrc',           pathBase + '/.babelrc');
        this.copyStub(__dirname + '/js/.npmrc.txt',         pathBase + '/.npmrc');
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
        this.copyStub(__dirname + '/js/src/ApiClient.js',  pathServices + '/ApiClient.js');

        // Models /src/Models
        Arr.each(this.models, (key, model) => {
            $this.buildModel(pathModels, model, pathStubs);
        });

        // Resources /src/Resources
        Arr.each(this.resources, (key, resource) => {
            $this.buildResource(pathResources, resource, pathStubs);
        });

        // Services /src
        var services = [];
        Arr.each(this.services, (key, service) => {
            services.push($this.buildService(pathServices, service, pathStubs));
        });

        // Gerar arquivo index.js
        this.copyIndex(services, pathBase);
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