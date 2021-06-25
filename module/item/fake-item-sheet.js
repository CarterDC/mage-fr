/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {Application}
 */
export class FakeItem extends Application {

  /** @override */
  constructor(dialogData) {
    super({ title: dialogData.item.data.data.displayName });

    this.actor = dialogData.actor;
    this.category = dialogData.category;
    this.key = dialogData.key;
    this.item = dialogData.item;

    const  itemSheetOptions = CONFIG.M20E.itemSheetOptions['fakeitem'];
    if(itemSheetOptions){
      this.options.width = this.position.width = itemSheetOptions.width;
      this.options.height = this.position.height = itemSheetOptions.height;
      //todo add paradigm class
    }
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['m20e', 'sheet', 'item'],
      template: 'systems/mage-fr/templates/item/fakeitem-sheet.hbs',
      resizable: true,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'detail' }]
    });
  }

  /** @override */
  getData() {
    const sheetData = super.getData();
    sheetData.item = this.item;
    sheetData.data = this.item.data.data;
    sheetData.category = this.category;
    sheetData.key = this.key;
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    html.find('input').change(this.onInputChange.bind(this));
    $(document).on('keydown', this.onKeyDown.bind(this));
    super.activateListeners(html);
  }

  async onInputChange(event) {
    event.preventDefault();
    let inputElement = event.currentTarget;
    let inputName = inputElement.name.substring(5); //get rid of 'data.'
    let inputValue = inputElement.value;

    this.item.data.data[inputName] = inputValue;
    this.actor._updateSingleValue(
      `${this.category}.${this.key}.${inputName}`,
      inputValue)
      .then(result => this.render());
  }

  onKeyDown(event) {
    // Close dialog
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return this.close({statUpdate: false});
    }
  }

  /** @inheritdoc */
  async close(options) {
    
    if(!options){
      //update stat if necessary
      
      let html = this.element;
      let entryToUpdate = undefined;
      html.find('input')
      .toArray()
      .forEach(input =>{
        //there con only be one field to update, at the most
        let entryName = input.name.substring(5);
        if(input.value !== this.item.data.data[entryName]){
          entryToUpdate = {name : entryName, value: input.value};
        }
      });
      if(entryToUpdate){
        await this.actor._updateSingleValue(
          `${this.category}.${this.key}.${entryToUpdate.name}`,
          entryToUpdate.value);
      }
    }
    return super.close();
  }
}