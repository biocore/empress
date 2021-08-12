define(["underscore"], function (_) {
    /**
     * @abstract
     * @class AbstractObserverPattern
     *
     * From Wikipedia: https://en.wikipedia.org/wiki/Observer_pattern
     * The observer pattern is a software design pattern in which an object,
     * named the 'Subject', maintains a list of its dependents, called
     * 'Observers',and notifies them automatically of any state changes, usually
     * by calling one of their methods.
     *
     * Any class that inherits AbstractObserverPattern will become a 'Subject'.
     *
     * @param{String} notifyFunction The function that Subject will call on all
     *                               of its observers. observers must implement
     *                               this function in order to register as an
     *                               observer.
     */
    class AbstractObserverPattern {
        constructor(notifyFunction) {
            if (this.constructor === AbstractObserverPattern) {
                throw new Error(
                    "Abstract class: " +
                        "AbstractObserverPattern cannot be instantiated."
                );
            }

            this.observers = [];
            this.notifyFunction = notifyFunction;
        }

        /*
         * Adds an observer to the observer list.
         */
        registerObserver(observer) {
            if (!this.hasNotifyFunction(observer)) {
                throw new Error(
                    "Cannot register observer: missing " + this.notifyFunction
                );
            }
            this.observers.push(observer);
        }

        /**
         * Notify all observers.
         */
        notify(data) {
            var scope = this;
            _.each(this.observers, function (obs) {
                obs[scope.notifyFunction](data);
            });
        }

        hasNotifyFunction(observer) {
            return typeof observer[this.notifyFunction] === "function";
        }
    }

    return AbstractObserverPattern;
});
