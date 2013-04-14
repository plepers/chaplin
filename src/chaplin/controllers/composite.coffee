'use strict'

_ = require 'underscore'
Backbone = require 'backbone'
EventBroker = require 'chaplin/lib/event_broker'

Controller = require 'chaplin/controllers/controller'

getRouteHash : ( route ) ->


module.exports = class CompositeController extends Controller

    constructor : ->
        @chilren = []
        @hashmap = {}
        super arguments...

    ###
        update composition with given routes
        and associated controllers classes
        check if ctrls routes are still valids
        create needed ones
        dipose invalids ctrls
    ###
    recompose : ( controllers, routes ) ->
        trash = {}

        newChilds = []
        newMap = {}

        # create a new children list with valids and
        # brand new controllers
        # set to null reused controller in old list
        for route, i in routes
            hash = route.controller+'#'+route.action
            index = @hashmap[ hash ]
            if index? and _.isEqual @chilren[index].route.params route.params
                newChilds.push @chilren[index]
                @chilren[index] = null
            else
                newChilds.push
                    route : route,
                    controller : new controllers[i]( route.params, route, route.options ),
                    built : false
            newMap[ hash ] = i;



        # dispose controller still in old list

        for child in @chilren
            @dispose child if child != null

        @chilren = newChilds
        @hashmap = newMap



        # execute unbuilt controllers

        for child in @chilren
            if not child.built
                if child.controller.beforeAction
                    @executeBeforeActions child.controller, child.route, child.route.params, child.route.options
                else
                    @executeAction child.controller, child.route, child.route.params, child.route.options

        # cleanup composer
        # add view to layout
        @publishEvent 'composite:composed', @chilren



    executeAction: (controller, route, params, options) ->
        # Dispose the previous controller.
        # if @currentController
        #     # Notify the rest of the world beforehand.
        #     @publishEvent 'beforeControllerDispose', @currentController

        #     # Passing new parameters that the action method will receive.
        #     @currentController.dispose params, route, options

        # Call the controller action with params and options.
        controller[route.action] params, route, options

        # Save the new controller and its parameters.
        # @currentController = controller
        # @currentParams = params

        # Stop if the action triggered a redirect.
        return if controller.redirected

        # Adjust the URL.
        # ??? skip this for now
        # @adjustURL route, params, options

        # We're done! Spread the word!
        # @publishEvent 'dispatcher:dispatch', @currentController,
        #     params, route, options

    # Before actions with chained execution.
    executeBeforeActions: (controller, route, params, options) ->
        beforeActions = []

        # Before actions can be extended by subclasses, so we need to check the
        # whole prototype chain for matching before actions. Before actions in
        # parent classes are executed before actions in child classes.
        for actions in utils.getAllPropertyVersions controller, 'beforeAction'

            # Iterate over the before actions in search for a matching
            # name with the arguments’ action name.
            for name, action of actions

                # Do not add this object more than once.
                if name is route.action or RegExp("^#{name}$").test route.action

                    if typeof action is 'string'
                        action = controller[action]

                    unless typeof action is 'function'
                        throw new Error 'Controller#executeBeforeActions: ' +
                            "#{action} is not a valid action method for #{name}."

                    # Save the before action.
                    beforeActions.push action

        # Save returned value and also immediately return in case the value is false.
        next = (method, previous = null) =>
            # Stop if the action triggered a redirect.
            return if controller.redirected

            # End of chain, finally start the action.
            unless method
                @executeAction controller, route, params, options
                return

            # Execute the next before action.
            previous = method.call controller, params, route, options, previous

            # Detect a CommonJS promise in order to use pipelining below,
            # otherwise execute next method directly.
            if previous and typeof previous.then is 'function'
                previous.then (data) =>
                    # Execute as long as the currentController is
                    # the callee for this promise.
                    if not @currentController or controller is @currentController
                        next beforeActions.shift(), data
            else
                next beforeActions.shift(), previous

        # Start beforeAction execution chain.
        next beforeActions.shift()


    disposeChild: (child) ->
        # /!\ route has additional params and options members
        child.controller.dispose child.route.params, child.route, child.route.options

        # publish dispose to layout
        @publishEvent 'beforeControllerDispose', child.controller