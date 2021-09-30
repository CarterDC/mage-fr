// Import Documents
import M20eItemSheet from './m20e-item-sheet.js'
// Import Helpers
import * as utils from '../../utils/utils.js'
import { log } from "../../utils/utils.js";

/**
 * @extends {M20eItemSheet}
 */
export default class M20eRoteSheet extends M20eItemSheet {

  /** @override */
  constructor(...args) {
    super(...args);
   
    this.locks = {effects: true};
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sheetData = super.getData(options);
    sheetData.locks = this.locks;
    sheetData.throw = sheetData.data.throws[0];
    sheetData.traits = sheetData.throw.traits.map(trait => {
      return {...trait.split(), value: trait.value}
    });
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
    }
    super.activateListeners(html);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  
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
        name: game.i18n.localize(`M20E.traits.spheres.${key}`),
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
    const spheres = this.actor.data.data.traits.spheres
    return Object.entries(spheres).reduce((acc, [key, sphere]) => {
      return sphere.value === 0 ? acc : 
      [...acc, {
        key: key,
        name: this.actor.locadigm(`traits.spheres.${key}`),
        valueMax : sphere.value
      }];
    }, []);
  }
}
