define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/tree/path'
  'chaplin/tree/sitetree'
  'chaplin/lib/event_broker'
  'chaplin/lib/sync_machine'
], (_, $, Backbone, mediator, Path, SiteTree, EventBroker, SyncMachine) ->
  'use strict'

  describe 'Path', ->

    path = null
    tree = null

    beforeEach ->
      tree = SiteTree.getInstance()
      tree.buildTree createDescriptor(), null


    afterEach ->
      path.dispose()
      path = null
      tree.dispose()

    delay = (callback) ->
      window.setTimeout callback, 40




    it 'parse null path', ->
     
      path = new Path 
      expect( path.path ).to.be ""



    it 'parse basic paths - no params', ->
     
      path = new Path "s1"
      expect(path.path).to.be "s1"

      path = new Path "s1/s2/s3"
      expect(path.path).to.be "s1/s2/s3"



    it 'trim trailling separator - no params', ->

      path = new Path "////"
      expect(path.path).to.be ""

      for pstr in [ '/s1', 's1/', '///s1', 's1////', '/////s1////' ]
        path = new Path pstr
        expect(path.path).to.be "s1"

      for pstr in [ '////s1/s2/s3',  's1/s2/s3////',  '////s1/s2/s3////', ]
        path = new Path pstr
        expect(path.path).to.be "s1/s2/s3"



    it 'path.segments', ->

      for pstr in [ '/s1', 's1/', '///s1', 's1////', '/////s1////' ]
        path = new Path pstr
        segs = path.segments()
        expect( segs ).to.be.an 'array'
        expect( segs ).to.eql [ 's1' ]

      for pstr in [ '////s1/s2/s3',  's1/s2/s3////',  '////s1/s2/s3////', ]
        path = new Path pstr
        segs = path.segments()
        expect( segs ).to.be.an 'array'
        expect( segs ).to.eql [ 's1', 's2', 's3' ]

    it 'node lookup', ->

      path = new Path "a1"
      node = path.toNode()
      expect( node ).not.to.be( null )
      expect( node.id ).to.be( 'a1' )

      path = new Path "a1/b1/c1"
      node = path.toNode()
      expect( node ).not.to.be( null )
      expect( node.id ).to.be( 'c1' )

      expect( new Path( "a1/b1/c1").toNode() ).to.be( new Path( "a1/b1/c1").toNode() )



   
    createDescriptor = ->
      desc =
        id : ''
        childs : 
          [ 
            {
              id : 'a1',
              childs : 
                [ 
                  {
                    id : 'b1',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  },{
                    id : 'b2',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  },{
                    id : 'b3',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  }
                ]
            },{
              id : 'a2',
              childs : 
                [ 
                  {id : 'b1'},
                  {id : 'b2'},
                  {id : 'b3'},
                ]
            },{
              id : 'a3',
              childs : 
                [ 
                  {id : 'b1'},
                  {id : 'b2'},
                  {id : 'b3'},
                ]
            },
          ]