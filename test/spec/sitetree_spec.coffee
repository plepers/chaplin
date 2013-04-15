define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/tree/sitetree'
  'chaplin/tree/path'
], (_, $, Backbone, mediator, SiteTree, Path) ->
  'use strict'

  describe 'SiteTree', ->

    tree = null
    
    beforeEach ->
      tree = SiteTree.getInstance()
      

    afterEach ->
      tree.dispose()

  
    it 'assert Singleton', ->
      expect( tree ).to.be SiteTree.getInstance()


   