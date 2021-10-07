/**
 * 
 * @extends {Dialog}
 */
 export class ItemCreateDlg extends Application {
  
  constructor(data={}, options={}) {
    super(options);
    this.data = data;
  }

    /** @inheritdoc */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
	    template: "systems/mage-fr/templates/sidebar/entity-create.html",
      classes: ["dialog"],
      title: game.i18n.localize('M20E.new.createItem'),
      width: 400,
      jQuery: true
    });
  }

  
  /** @inheritdoc */
  getData(options) {

  }


/*  // Collect data
  const documentName = this.metadata.name;
  const types = game.system.entityTypes[documentName];
  const folders = game.folders.filter(f => (f.data.type === documentName) && f.displayed);
  const label = game.i18n.localize(this.metadata.label);
  const title = game.i18n.localize('M20E.new.createItem');
  //system specific
  const itemTypes = types.reduce((obj, t) => {
    const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
    obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
    return obj;
  }, {});

  const subTypes = Object.entries(CONFIG.M20E[`${data.type || types[0]}SubTypes`]).map( ([key, value]) => {
    return {id: key, name: game.i18n.localize(value)};
  });

  // Render the entity creation form
  const html = await renderTemplate(`systems/mage-fr/templates/sidebar/entity-create.html`, {
    name: data.name || game.i18n.format("ENTITY.New", {entity: label}),
    folder: data.folder,
    folders: folders,
    hasFolders: folders.length > 1,
    isItem: true,
    type: data.type || types[0],
    types: itemTypes,
    hasTypes: types.length > 1//,
    //subType: data.subType || subTypes[0],
    //subTypes: subTypes,
    //hasSubTypes: subTypes.length > 1
  });

  // Render the confirmation dialog window
  return ItemCreateDlg.prompt({
    title: title,
    content: html,
    label: title,
    render: html => {
      html.find(".listened").change( event => {
        log(this);
        //this.render(true);
      });
    },
    callback: html => {
      const form = html[0].querySelector("form");
      const fd = new FormDataExtended(form);
      data = foundry.utils.mergeObject(data, fd.toObject());
      if ( !data.folder ) delete data["folder"];
      if ( types.length === 1 ) data.type = types[0];
      return this.create(data, {renderSheet: true});
    },
    rejectClose: false,
    options: options
  });*/


}