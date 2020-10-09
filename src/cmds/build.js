const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const SdkBuild = require('../sdk-build');
const { Command } = require('@rhinojs/console');

class BuildCommand extends Command
{
    constructor()
    {
        super('build [project]', 'project name to build');
    }

    run()
    {
        // Carregar nome do projeto
        var project = this.argument('project');
        project = (!project) ? process.cwd() : path.resolve(process.cwd(), project);
        project = path.resolve(project, 'build.yml');

        var prjFile = path.resolve(process.cwd(), project);
        if (!fs.existsSync(prjFile)) {
            throw "Definiçções do build [build.yml] não foram encontradas";
        }

        // Carregar projeto
        var prjPath = path.dirname(prjFile);
        var prjCode = fs.readFileSync(prjFile).toString();

        const prj = yaml.parse(prjCode);

        //console.log(prj);

        const sb = new SdkBuild(this, prj, prjPath, {});

        sb.run();
    }
}

module.exports = BuildCommand;