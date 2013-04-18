'use strict'

Controller = require './controller'
View = require 'chaplin/views/view'

class RootView extends View

    render: ->
        # root view don't render anything



module.exports = class Root extends Controller

    initialize : ( context ) ->
        @view = new RootView


    getRegion: ( index ) ->
        if index isnt 0
            return null
        return document.body
        return @view.el