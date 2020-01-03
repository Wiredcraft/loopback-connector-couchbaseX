'use strict';

require('should');

const { objToArr } = require('../lib/utils');
describe('utils', () => {
  describe('objToArr', () => {
    it('should convert to array with id and value if existing document', () => {
      const input = {
        id1: { value: { foo: 'bar' }, cas: '1512352' },
        id2: { value: { baz: 'quz' }, cas: '1512353' },
        id3: { error: { CouchbaseError: 'The key does not exist...' } }
      };
      const output = objToArr(input);
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
      const output = objToArr(input);
      output.should.be.Array();
      output.should.be.eql([]);
    });
  });
});

