define([], function () {
    var defaultCommands = {
        ColorFeatureTreeCommand: ColorFeatureTreeCommand,
    };

    function CommandManager(empress) {
        this.empress = empress;
        this.executed = [];
        this.toExecute = [];
        this.commands = defaultCommands;
    }

    CommandManager.prototype.push = function (command) {
        this.toExecute.push(command);
    };

    CommandManager.prototype.executeNext = function () {
        let command = this.toExecute.shift();
        command.execute();
        this.executed.push(command);
    };

    CommandManager.prototype.executeAll = function () {
        while (this.toExecute.length > 0) {
            this.executeNext();
        }
    };

    CommandManager.prototype.getSerializable = function () {
        var objects = [];
        this.executed.forEach(function (command) {
            var commandObject = {
                command: command.constructor.name,
                arguments: command.toObject(),
            };
            objects.push(commandObject);
        });
        return objects;
    };

    CommandManager.prototype.parse = function (object) {
        var scope = this;
        object.forEach(function (commandObject) {
            var commandConstructor = scope.commands[commandObject.command];
            var args = commandObject.arguments;
            args.empress = scope.empress;
            var newCommand = new commandConstructor(args);
            scope.push(newCommand);
        });
    };

    function ColorFeatureTreeCommand(arguments) {
        this.empress = arguments.empress;
        this.collapseClades = arguments.collapseClades;
        this.lineWidth = arguments.lineWidth;
        this.colBy = arguments.colBy;
        this.col = arguments.col;
        this.coloringMethod = arguments.coloringMethod;
        this.reverse = arguments.reverse;
    }

    ColorFeatureTreeCommand.prototype.toObject = function () {
        // TODO control behavior when an attribute is undefined
        return {
            collapseClades: this.collapseClades,
            lineWidth: this.lineWidth,
            colBy: this.colBy,
            col: this.col,
            coloringMethod: this.coloringMethod,
            reverse: this.reverse,
        };
    };

    ColorFeatureTreeCommand.prototype.execute = function () {
        this.empress.resetTree();
        // color the tree
        this.empress.colorByFeatureMetadata(
            this.colBy,
            this.col,
            this.coloringMethod,
            this.reverse
        );

        if (this.collapseClades) {
            this.empress.collapseClades();
        }
        this.empress.thickenColoredNodes(this.lineWidth);
        this.empress.drawTree();
    };

    return {
        CommandManager: CommandManager,
        ColorFeatureTreeCommand: ColorFeatureTreeCommand,
    };
});
