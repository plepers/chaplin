define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/models/dom_model'
], (_, $, Backbone, mediator, DomModel) ->
  'use strict'

  describe 'DomModel', ->

    
    

    # beforeEach ->
    #   tree = SiteTree.getInstance()
    #   tree.buildTree createDescriptor(), null


    # afterEach ->
    #   tree.dispose()

  
    it 'parse test 1', ->
      dommdl = new DomModel
      root = dommdl.parseNode document.body

      layout = root.children[0]

      expect( layout.id ).to.be 'mainlayout'
      expect( layout.children.length ).to.be 3
       