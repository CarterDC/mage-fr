// Import Documents
import M20eItemSheet from './m20e-item-sheet.js'
// Import Helpers
import * as utils from '../../utils.js'
import { log } from "../../utils.js";

/**
 * @extends {M20eItemSheet}
 */
export default class M20eRoteSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.throwIndex = 0;
    this.locks = {effects: true};
  }

  /* -------------------------------------------- */

  get m20eThrow() {
    return this.item.data.data.throws[this.throwIndex];
  }

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    sheetData.data = duplicate(this.m20eThrow);
    sheetData.stats = this.m20eThrow.stats.map(stat => {
      return {...stat.split(), value: stat.value}
    });
    sheetData.data.throwOptions = JSON.stringify(sheetData.data.options) || {};
    sheetData.availEffects = this.getAvailEffects();
    return sheetData;
  }

  /** @override */
  activateListeners(html) {
    //editable only (roughly equals 'isOwner')
    if ( this.options.editable ) {
      html.find('select').change(this._onSelectChange.bind(this));
      //html.find('.listened-input').change(this._onInputChange.bind(this));
      html.find('.bullet[data-clickable="true"').click(this._onBulletClick.bind(this));
      html.find('.inline-edit').change(this._onInlineEditChange.bind(this));
    }
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  async _onInlineEditChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const inputElem = event.currentTarget;
    if ( ! utils.isValidUpdate(inputElem) ) {
      return this.render();
    }
    //value has been validated => update the item
    const updatePath = inputElem.dataset.updatePath || 'data.value';
    let updateValue = inputElem.value;

    let currThrow = duplicate(this.m20eThrow);
    if ( updatePath === 'options' ) {
      currThrow.options = {...currThrow.options, ...JSON.parse(inputElem.value)}
    } else {
      foundry.utils.setProperty(currThrow, updatePath, updateValue);
    }

    const throws = duplicate(this.item.data.data.throws);
    throws[this.throwIndex] = currThrow;
    return await this.item.update({['data.throws']: throws});
  }

  /**
   * @param  {} event
   */
  _onSelectChange(event) {
    const selectElem = event.currentTarget;
    const traitElem = selectElem.closest(".trait");
    this.item.updateEffectKey(traitElem.dataset.index, selectElem.options[selectElem.selectedIndex].value);
  }

  /**
   * @param  {} event
   */
  _onBulletClick(event) {
    const bulletElem = event.currentTarget;
    const traitElem = bulletElem.closest(".trait");
    const newValue = parseInt(bulletElem.dataset.index) + 1; //bullet indexes are base 0 !
    this.item.updateEffectValue(traitElem.dataset.index, newValue);
  }

  /**
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async addItem(buttonElem) {
    this.item.addEffect(this.getAvailEffects());
  }

  /**
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async editItem(buttonElem) {
    //does nothing, there's no edit button on rote effects ^^
  }

  /**
   * Note : In this context 'Item' refers to a magycal effect in the form of a Trait object
   * in itemData.data.throws[{traitsToRoll[]}]
   *  @override
   */
  async removeItem(buttonElem) {
    //no prompt, just do it ! 
    this.item.removeEffect((buttonElem.closest(".trait").dataset.index))
  }


  /* -------------------------------------------- */
  /*  Implementation                              */
  /* -------------------------------------------- */


  /**
   * returns sorted and 'filtered' list of available sphere effects
   * already chosen effects are 'filtered' aka disabled in the select
   * 
   * @return {Array} [{key, name, valueMax, disabled},]
   */
  getAvailEffects() {
    const sphereList = this.item.actor ? this.effectsFromActor() : this.effectsFromConfig();
    //disable already chosen effects
    const roteEffects = this.item.roteEffects;
    sphereList.forEach(effect => {
      effect.disabled = roteEffects.includes(effect.key) ? 'disabled' : '';
    });
    sphereList.sort(utils.alphaSort());
    return sphereList;
  }

  /**
   * returns list of all sphere effects from config
   * 
   * @return {Array} [{key, name, valueMax},]
   */
  effectsFromConfig() {
    return CONFIG.M20E.spheres.map( key => (
      {
        key: key,
        name: game.i18n.localize(`M20E.spheres.${key}`),
        valueMax : 5
      }
    ));
  }

  /**
   * returns list of actor's trained sphere effects
   * 
   * @return {Array} [{key, name, valueMax},]
   */
  effectsFromActor() {
    const spheres = this.actor.data.data.spheres
    return Object.entries(spheres).reduce((acc, [key, sphere]) => {
      return sphere.value === 0 ? acc : 
      [...acc, {
        key: key,
        name: this.actor.locadigm(`spheres.${key}`),
        valueMax : sphere.value
      }];
    }, []);
  }

  //todo: do an onclose to update the throw fields with special handling of full options
}
