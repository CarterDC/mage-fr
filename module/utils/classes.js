
/**
 * Helper class : Uniquely defines a Trait object by it's path relative to data.traits,
 * or itemId (if referencing a trait that's actually an item)
 */
export class Trait {

  /**
   * @param  {Object} obj {path, itemId, data}
   */
  constructor(obj) {
      this.path = obj.path;
      this.itemId = obj.itemId || '';
      this.data = obj.data || null;
  }

  /**
   * Creates a new instance of Trait by getting infos from an html element's parents (.trait and .category)
   * 
   * @param  {HTMLElement} htmlElem an html element inside a '.trait' inside a '.category'
   * 
   * @returns {Trait|null} a Trait object made from the aquired info or null
   */
  static fromElement(htmlElem) {
    const traitElem = htmlElem.closest(".trait");
    const path = traitElem.dataset.path;
    const itemId = traitElem.dataset.itemId

    if ( !path && !itemId) { return null; }
    return new Trait({
      path: path || '',
      itemId: itemId || ''
    });
  }

  static fromData(path, data={}, itemId='') {
    if ( !path ) { return null; }
    return new Trait({path: path, data: data, itemId: itemId});
  }

  /* -------------------------------------------- */
  /*  Path related                                */
  /* -------------------------------------------- */

  /**
   * Parses a path into an object containing category, subType and key
   * @param  {String} path a path relative to data.traits
   * 
   * @returns {object} {category, subType|null, key|null}
   */
  static splitPath(path) {
    const propKeys = path.split('.');
    return {
      category: propKeys[0],
      subType: propKeys.length === 3 ? propKeys[1] : null,
      key: propKeys.length === 3 ? propKeys[2] : (propKeys[1] || null)
    };
  }

  /**
   * Parses the trait's own path into an object containing cat, subType, key
   * @returns {object} {category, subType|null, key|null}
   */
  split() {
    return {...Trait.splitPath(this.path), itemId: this.itemId};
  }

  get category() {
    const propKeys = this.path.split('.');
    return propKeys[0];
  }

  get subType() {
    const propKeys = this.path.split('.');
    return propKeys.length === 3 ? propKeys[1] : null;
  }

  get key() {
    const propKeys = this.path.split('.');
    return propKeys.length > 1 ? propKeys[propKeys.length - 1] : null;
  }

  /* -------------------------------------------- */
  /*  data related                                */
  /* -------------------------------------------- */

  /**
   * Returns the Trait value or its overriden value (ie: in the case of rote effects)
   */
  get value() {
    return this.data.valueOverride >= 0 ? this.data.valueOverride : this.data.value;
  }

  get canUseSpec() {
    return this.value >= 4 && this.data.specialisation !== '';
  }

  get useSpec() {
    return this.canUseSpec && this.data.useSpec;
  }

  get name() {
    return this.useSpec ? this.data.specialisation : 
      (this.data.displayName ? this.data.displayName : this.data.name);
  }

  get specName() {
    return this.useSpec ? this.name : this.data.specialisation;
  }


  get isItem() {
    return this.itemId !== ''; //todo can do better in some circumstances
  }

  get isExtended() {
    return this.data.value >= 0;
  }
}

/**
 * helper class 
 */
export class MageThrow {
  constructor(obj={}) {
    this.name = obj.name || '';
    this.description = obj.description || '';
    this.traits = obj.traits || [];
    this.options = obj.options || {};
  }
  /**
   * Check whether actor is able to/allowed to perform this throw according to the rules
   * @param  {M20eActor} actor
   */
  isRollable(actor) {
    if( this.traits.every( trait => trait.category === "spheres" ) ) {
      //throw is a magical effect => actor MUST have all spheres at the requiered level
      return this.traits.every( trait => {
        const actorValue = foundry.utils.getProperty(actor.data.data.traits, `${trait.path}.value`);
        return actorValue >= trait.value;
      });
    } else {
      const settings = game.settings.get("mage-fr", "untrainedMalus");
      const abilities = this.traits.filter( trait => trait.category === 'abilities');
      if ( !settings.includes('X') || abilities.length === 0 ) { return true; }
      //if throw constains a 0 level ability => check settings regarding ability subType
      const subTypes = {talents: 0, skills: 1, knowledges: 2};
      return !abilities.some( ability => {
        const actorValue = foundry.utils.getProperty(actor.data.data.traits, `${ability.path}.value`);
        return actorValue === 0 && settings.substr(subTypes[ability.subType],1) === 'X';
      });
    }
  }

  getFlavor(actor) {
    let flavor = '';
    if ( actor ) {
      flavor = this.traits.map(trait => {
        const {name, displayName} = actor.getExtendedTraitData(trait);
        return displayName || name;
      }).join(' + ');
    } else {
      flavor = this.traits.map(trait => 
      `${foundry.utils.getProperty(CONFIG.M20E.traits, trait.path)}`
      ).join(' + ');
    }
    const thresholdBase = this.options.thresholdBase || game.settings.get("mage-fr", "baseRollThreshold");
    const thresholdMod = this.options.thresholdMod || 0;
    const thresholdTotal = parseInt(thresholdBase) + parseInt(thresholdMod);
    return `(${flavor} ${game.i18n.localize('M20E.labels.thrsh')}${thresholdTotal})`;
  }
}

/**
 * helper class to be used by utils.prompts functions
 */
export class PromptData {
  constructor(obj) {
    this.title = obj.title || null;
    this.name = obj.name || null;
    this.currentValue = obj.currentValue || '';
    this.placeHolder = obj.placeHolder || '';
    this._promptContent = obj.promptContent || null;
  }

  /**
   * retruns the actual _promptContent or generates a basic 'prompt new value' one.
   * @returns {String} 
   */
  get promptContent() {
    if ( this._promptContent ) {
      return this._promptContent;
    } else {
      if ( this.name ) {
        return game.i18n.format("M20E.prompts.newValue", {name : this.name});
      } else {
        return '';
      }
    }
  }
}

export class DynaCtx extends ContextMenu {

  constructor(element, selector, callback) {
    super(element, selector, []);
    this.callback = callback;
  }

  render(target) {
    if ( this.callback instanceof Function ) {
      const menuOptions = this.callback(target[0]);
      if ( !menuOptions || menuOptions === [] ) { return this.close();}
      this.menuItems = menuOptions;
      this.renderShift(target);
    }
  }

  renderShift(target) {
    let html = $("#context-menu").length ? $("#context-menu") : $('<nav id="context-menu"></nav>');
    let ol = $('<ol class="context-items"></ol>');
    html.html(ol);

    // Build menu items
    for (let item of this.menuItems) {

      // Determine menu item visibility (display unless false)
      let display = true;
      if ( item.condition !== undefined ) {
        display = ( item.condition instanceof Function ) ? item.condition(target) : item.condition;
      }
      if ( !display ) continue;

      // Construct and add the menu item
      let name = game.i18n.localize(item.name);
      let li = $(`<li class="context-item macro-ready" draggable="true" data-action="roll-throw" data-item-id="${item.itemId}" data-throw-index="${item.throwIndex}">${item.icon}${name}</li>`);
      li.children("i").addClass("fa-fw");
      li.click(e => {
        e.preventDefault();
        e.stopPropagation();
        item.callback(target, e);
        this.close();
      });
      li[0].addEventListener('dragstart', (e) => {
        const callback = item.dragDropCallbacks['dragstart'];
        callback(e);
        if ( e.dataTransfer.items.length ) e.stopPropagation();
        //this.close();
      });
      li[0].addEventListener('drop', (e) => {
        e.preventDefault();
        const callback = item.dragDropCallbacks['drop'];
        callback(e);
        this.close();
      });

      ol.append(li);
    }

    // Bail out if there are no children
    if ( ol.children().length === 0 ) return;

    // Append to target
    this._setPosition(html, target);

    // Animate open the menu
    return this._animateOpen(html);
  }
}