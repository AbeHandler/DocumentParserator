describe('Testing the regex', function(){
  describe('Should tokenize the text correctly', function(){
    it('Correctly replaces items in the string the string', function(){
      var string = "NEW THE ORLEANS BY AND THROUGH THE NEW ORLEANS AVIATION BOARD";
      tokens = tokenize(string);
      expect(tokens.length).to.be.equal(22);
      var output = re_write(tokens);
      expect(output).to.be.equal("<span class='token'>NEW</span> <span class='token'>THE</span> <span class='token'>ORLEANS</span> <span class='token'>BY</span> <span class='token'>AND</span> <span class='token'>THROUGH</span> <span class='token'>THE</span> <span class='token'>NEW</span> <span class='token'>ORLEANS</span> <span class='token'>AVIATION</span> <span class='token'>BOARD</span>");
    })
  })
})