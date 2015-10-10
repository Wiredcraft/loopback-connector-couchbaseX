// This test written in mocha
var should = require('./init.js');
var assert = require('assert');
var db = getDataSource();

describe('Couchbase CRUD methods', function() {
  var Person = db.createModel('person', {id: {type: String, id: true}, name: String, age: Number});
  var Student = db.createModel('student', {No: {type: String, id: true}, name: String, age: Number, emails:[String]});

  //CREATE TEST
  it('create one test', function(done) {
    Person.create({
      id: '1',
      name: 'Charlie',
      age: 24
    }, function(err, res) {
      if(err) console.log(err);
      res.age.should.eql(24);
      res.name.should.eql('Charlie');

      Person.create({
        id: '11',
        name: 'Charlie1',
        age: 25
      }, function(err, res) {
        if(err) console.log(err);
        res.age.should.eql(25);
        res.name.should.eql('Charlie1');
        done(err, res);
      });
    });
  });

  it('create two test', function(done) {
    Person.create({
      id: '2',
      name: 'Mary',
      age: 34
    }, function(err, res) {
      if(err) console.log(err);
      //console.log(res);
      res.age.should.eql(34);
      res.name.should.eql('Mary');
      done(err, res);
    });
  });

  it('create three test', function(done) {
    Student.create({
      No: '3',
      name: 'Jason',
      age: 44,
      emails: ['john@x.com', 'john@y.com']
    }, function(err, res) {
      if(err) console.log(err);
      //console.log(res);
      res.age.should.eql(44);
      res.name.should.eql('Jason');
      res.emails.should.eql(['john@x.com', 'john@y.com']);
      done(err, res);
    });
  });

  it('create error test', function(done) {
    Person.create({
      id: '1',
      name: 'Charlie',
      age: 24
    }, function(err, res) {
      if(err) {
        err.code.should.eql(12); //already have a item id 
        err = null;
      }
      done(err, res);
    });
  });

  //FIND TEST
  it('find one test', function(done) {
    Person.find({id: '1'}, function(err, res) {
      if(err) console.log(err);
      res.value.age.should.eql(24);
      res.value.name.should.eql('Charlie');

      Person.find({id: '11'}, function(err, res) {
        if(err) console.log(err);
        res.value.age.should.eql(25);
        res.value.name.should.eql('Charlie1');
        done(err, res);
      });
    });
  });

  it('find two test', function(done) {
    Person.find({id: '2'}, function(err, res) {
      if(err) console.log(err);
      res.value.age.should.eql(34);
      res.value.name.should.eql('Mary');
      done(err, res);
    });
  });

  it('find three test', function(done) {
    Student.find({No: '3'}, function(err, res) {
      if(err) console.log(err);
      res.value.age.should.eql(44);
      res.value.name.should.eql('Jason');
      res.value.emails.should.eql(['john@x.com', 'john@y.com']);
      done(err, res);
    });
  });

  it('find error test', function(done) {
    Person.find({id: '10'}, function(err, res) {
      if(err) {
        err.code.should.eql(13);
        err = null;
      }
      done(err, res);
    });
  });

  //UPDATE TEST
  it('update one test', function(done) {
    Person.update({
      id: '1'
    },{
      id: '1',
      name: 'Charlie1',
      age: 37
    }, function(err, res) {
      if(err) console.log(err);

      Person.update({
        id: '11'
      },{
        id: '11',
        name: 'Charlie2',
        age: 37
      }, function(err, res) {
        if(err) console.log(err);
        done(err, res);
      });
    });
  });

  it('update two test', function(done) {
    Person.update({
      id: '2'
    },{
      id: '2',
      name: 'Mary1',
      age: 37
    }, function(err, res) {
      if(err) console.log(err);
      done(err, res);
    });
  });

  it('update three test', function(done) {
    Student.update({
      No: '3'
    },{
      No: '3',
      name: 'Jason1',
      age: 37,
      eamils: ['john@x.com']
    }, function(err, res) {
      if(err) console.log(err);
      done(err, res);
    });
  });

  //DESTROY TEST
  it('destroy one test', function(done) {
    Person.remove({
      id: '1'
    },function(err, res) {
      if(err) console.log(err);

      Person.remove({
        id: '11'
      },function(err, res) {
        if(err) console.log(err);
        done(err, res);
      });
    });
  });

  it('destroy two test', function(done) {
    Person.remove({
      id: '2'
    },function(err, res) {
      if(err) console.log(err);
      done(err, res);
    });
  });

  it('destroy three test', function(done) {
    Student.remove({
      No: '3'
    },function(err, res) {
      if(err) console.log(err);
      done(err, res);
    });
  });

  it('destroy error test', function(done) {
    Person.remove({
      id: '1'
    },function(err, res) {
      if(err) {
        err.code.should.eql(13);
        err = null;
      }
      done(err, res);
    });
  });

  // it('count', function(done) {
  //   Person.count({id: 'asd'}, function(err, person) {
  //     console.log(err);
  //     console.log(JSON.stringify(person));//person.name.should.equal('Charlie');
  //     done(err, person);
  //   });
  // });

  // it('exists', function(done) {
  //   Person.exists('asd', function(err, person) {
  //     console.log(err);
  //     person.name.should.equal('Charlie');
  //     done(err, person);
  //   });
  // });

  



});
