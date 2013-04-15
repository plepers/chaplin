
Node = require './node'

instance = null

module.exports = class SiteTree 



    constructor: () ->
        @rootNode = new Node
        @rootNode.describe
            id:''
        @rootNode.on 'node:change', @nodeChange

    nodeChange:( event ) =>
        console.log event 

    getNode:(route) ->

    # build nodes struct from simple object/json description
    # {
    #     "id"      : "./crossover",
    #     "childs"    :
    #     [
    #         {
    #             "id"      : "./",
    #             "childs"    :
    #             [
    #                 "..."
    #             ]
    #         }
    #     ]
    # }

    buildTree : ( data, target ) ->
        target ?= @rootNode
        return unless data.childs?
        for sub in data.childs
            node = @nodeFactory sub, target
            node = target.addChild node
            @buildTree sub, node

    nodeFactory: ( data, parent ) ->
        node = new Node parent
        node.describe data
        return node

    dispose: ->
        @rootNode?.dispose()
        @rootNode = null
        instance = null
        
SiteTree.getInstance = ->
    instance ?= new SiteTree