/**
 * 
 * @extends {Application}
 */
 export default class DiceDialogue extends Application {
  
  /** @override */
  constructor(diceThrow, options){
    super(options);

    this.diceThrow = diceThrow;
    this.closeOnRoll = true;
  }

  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'dialogue'],
      template: 'systems/mage-fr/templates/apps/dice-throw.hbs',
      title: game.i18n.localize('M20E.diceThrows.diceThrows'),
      width: 300,
      height: 'fit-content',
      resizable: false
    });
  }

  /** @override */
  getData () {
    const appData = super.getData();

    appData.diceThrow = this.diceThrow;
    appData.traits = this.diceThrow.xTraitsToRoll;

    let radioOptions = [
      {value : "2", checked : ""},
      {value : "3", checked : ""},
      {value : "4", checked : ""},
      {value : "5", checked : ""},
      {value : "6", checked : ""},
      {value : "7", checked : ""},
      {value : "8", checked : ""},
      {value : "9", checked : ""},
      {value : "10", checked : ""}
    ];

    appData.radioOptions = radioOptions;
    appData.closeOnRoll = this.closeOnRoll;
    return appData;
  }
 }