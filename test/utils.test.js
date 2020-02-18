'use strict';

const should = require('should');

const { objToArr, unpackRes } = require('../lib/utils');
describe('utils', () => {
  describe('objToArr', () => {
    it('should convert to array with id and value if existing document', () => {
      const input = {
        id1: { value: { foo: 'bar' }, cas: '1512352' },
        id2: { value: { baz: 'quz' }, cas: '1512353' },
        id3: { error: { CouchbaseError: 'The key does not exist...' } }
      };
      const output = objToArr(input, Object.keys(input));
      output.should.be.Array();
      output.should.be.eql([
        ['id1', { foo: 'bar', _cas: '1512352' }],
        ['id2', { baz: 'quz', _cas: '1512353' }]
      ]);
    });
    it('should convert to array discarding the document with query error', () => {
      const input = {
        id3: { error: { CouchbaseError: 'The key does not exist...' } }
      };
      const output = objToArr(input, Object.keys(input));
      output.should.be.Array();
      output.should.be.eql([]);
    });
  });
  describe('unpackRes', () => {
    it('unpackRes should return object', () => {
      const input = {
        value: {
          foo: 'bar'
        },
        cas: '1512352'
      };
      const output = unpackRes(input);
      output.should.be.Object().deepEqual({ foo: 'bar', _cas: '1512352' });
    });
    it('unpackRes should return null withoud cas key', () => {
      const input = {
        value: {
          foo: 'bar'
        }
      };
      const output = unpackRes(input);
      should(output).be.null();
      should(unpackRes(null)).be.null();
    });
  });
});

