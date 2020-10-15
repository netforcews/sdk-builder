const { Arr } = require('@rhinojs/support');
const BuildJS = require('./outputs/BuildJS');
const BuildPHP = require('./outputs/BuildPHP');

class SdkBuild
{
    constructor(cmd, prj, prjPath, opts = {}) {

        this.cmd         = cmd;
        this.project     = prj;
        this.options     = opts;

        Object.assign(this.options, {
            projectPath: prjPath
        });

        this.outputs = {
            js: true,
            php: true,
        };

    }

    run() {
        var $this = this;
        this.cmd.alert('Building SDK...');

        var version = Arr.get(this.project, 'build.version', '0.0.0');
        this.cmd.log(' - version: ' + version);
        
        // Preparar diretorio destino
        //..
        
        // Filtrar outputs
        var keys = Object.keys(this.outputs);
        keys = keys.filter((k) => {
            return $this.outputs[k];
        });
        
        // Compilar
        if (keys.length == 0) {
            throw "Nenhum output foi definido";
        }

        this.cmd.log(' - output: ');
        for (var i = 0; i < keys.length; i++) {
            var outKey = keys[i];

            this.cmd.info('     ' + outKey);

            switch (outKey) {
                case 'js':
                    var $js = new BuildJS(this.cmd, this.project, this.options);
                    $js.build();
                    break;

                case 'php':
                    var $php = new BuildPHP(this.cmd, this.project, this.options);
                    $php.build();
                    break;

                default:
                    throw "Output [" + outKey + "] não implementado";
            }
        }
    }
}

module.exports = SdkBuild;