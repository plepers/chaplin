'use strict'

Controller = require './controller'
View = require 'chaplin/views/view'

class RootView extends View

    render: ->
        # root view don't render anything



module.exports = class Root extends Controller

    run : ->
        @view = new RootView


    createRegions: ( len ) ->
        res = []
        for i in [0..len]
            res[i] = document.body
        res