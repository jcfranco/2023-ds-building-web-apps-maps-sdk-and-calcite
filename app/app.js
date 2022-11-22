import Map from "https://js.arcgis.com/4.25/@arcgis/core/Map.js";
import WebMap from "https://js.arcgis.com/4.25/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/4.25/@arcgis/core/views/MapView.js";
import Home from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Home.js";
import Legend from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Legend.js";
import Search from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Search.js";
import Expand from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Expand.js";
import { whenFalseOnce } from "https://js.arcgis.com/4.25/@arcgis/core/core/watchUtils.js";

import * as networkService from "https://js.arcgis.com/4.25/@arcgis/core/rest/networkService.js";
import Graphic from "https://js.arcgis.com/4.25/@arcgis/core/Graphic.js";
import ServiceAreaParameters from "https://js.arcgis.com/4.25/@arcgis/core/rest/support/ServiceAreaParameters.js";
import FeatureSet from "https://js.arcgis.com/4.25/@arcgis/core/rest/support/FeatureSet.js";
import * as serviceArea from "https://js.arcgis.com/4.25/@arcgis/core/rest/serviceArea.js";

import { appConfig } from "./config.js";
import { appState } from "./state.js";

async function init() {
  // query for elements
  const resultsNode = document.getElementById("results");
  const walkingDistanceSliderNode = document.getElementById("walkingDistanceSlider");
  const cuisineTypeNode = document.getElementById("cuisineType");
  const amenityTypeNode = document.getElementById("amenityType");
  const resultBlockNode = document.getElementById("resultBlock");
  const paginationNode = document.getElementById("pagination");
  const filtersNode = document.getElementById("filters");
  const resetNode = document.getElementById("reset");
  const flowNode = document.getElementById("flow");
  const themeNode = document.getElementById("themeToggle");
  const darkThemeCss = document.getElementById("jsapi-theme-dark");
  const lightThemeCss = document.getElementById("jsapi-theme-light");
 
  /* Yelp */
  const apiKeyYelp = ""
  const urlYelpApiBusiness = "https://api.yelp.com/v3/businesses/" // businessId
  
  /* ArcGIS Location Services */
  const apiKeyArcGIS = ""
  const routeServiceUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";
  let travelMode = null;
  var loadComplete = false;
  
  async function getAttachment(objectId, result) {
    const campusImageContainerNode = document.getElementById(
      "campusImageContainer"
    );
    campusImageContainerNode.innerHTML = "";

    // const attachments = await amenityLayer.queryAttachments({
    //   objectIds: [objectId],
    //   num: 1,
    // });

    // const attachmentGroup = attachments[objectId];

    // if (attachmentGroup) {
    //   const attachment = attachmentGroup[0];
    //   const image = document.createElement("img");
    //   image.src = `${attachment.url}/${attachment.name}`;
    //   campusImageContainerNode.appendChild(image);
    //   return;
    // }

    const container = document.createElement("div");
    container.id = "campusViewDiv";
    campusImageContainerNode.appendChild(container);

    const map = new Map({
      basemap: "satellite",
    });

    const view = new MapView({
      container,
      map,
      center: [result.geometry.longitude, result.geometry.latitude],
      zoom: 15,
    });

    view.ui.components = [];
  }

  // display requested item data
  // handle flow destroying dom of added panel...
  async function resultClickHandler(objectId) {
    appState.savedExtent = view.extent.clone();
    appState.activeItem = true;

    await whenFalseOnce(amenityLayerView, "updating");

    const { features } = await amenityLayerView.queryFeatures({
      returnGeometry: true,
      outSpatialReference: view.spatialReference,
      objectIds: [objectId],
      outFields: appConfig.amenityLayerOutFields,
    });

    const result = features[0];

    if (!result.geometry || !result.attributes) {
      return;
    }

    // Query the Yelp API
    const yelpBusinessInfo = await getBusinessInformationById(result.attributes['yelp'])
    filtersNode.hidden = true;
    const attributes = result.attributes;
    const detailPanelNode = document.getElementById("detail-panel");
    // a janky way to replace content in a single panel vs appending entire new one each time
    if (!detailPanelNode) {
      const panel = document.createElement("calcite-panel");
      panel.heading = handleCasing(attributes["name"]);
      panel.id = "detail-panel";
      panel.addEventListener("calcitePanelBackClick", async () => {
        if (appState.savedExtent) {
          await view.goTo(appState.savedExtent);
          appState.savedExtent = null;
        }
        appState.activeItem = false;
        filtersNode.hidden = false;
      });

      // Contain the calcite-block elements for the scrollbar
      const div = document.createElement("div");
      div.classList.add("calcite-panel-contents");

      const blockOne = document.createElement("calcite-block");
      blockOne.classList.add("calcite-block-contents");
      blockOne.heading = "Amenity overview";
      blockOne.collapsible = true;
      blockOne.open = true;

      const blockTwo = document.createElement("calcite-block");
      blockTwo.classList.add("calcite-block-contents");
      blockTwo.heading = "Address";
      blockTwo.collapsible = true;
      blockTwo.open = true;

      const blockThree = document.createElement("calcite-block");
      blockThree.classList.add("calcite-block-contents");
      blockThree.heading = "Opening hours";
      blockThree.collapsible = false;
      blockThree.open = true;

      const blockFour = document.createElement("calcite-block");
      blockFour.classList.add("calcite-block-contents");
      blockFour.heading = "Contact";
      blockFour.collapsible = false;
      blockFour.open = true;

      const blockFive = document.createElement("calcite-block");
      blockFive.classList.add("calcite-block-contents");
      blockFive.heading = "Rating";
      blockFive.collapsible = false;
      blockFive.open = true;

      const campusImageNode = document.createElement("div");
      campusImageNode.id = "campusImageContainer";
      campusImageNode.className = "campus-image-container";

      blockOne.appendChild(campusImageNode);

      if (attributes["website"]) {
        const itemWebsite = document.createElement("calcite-button");
        itemWebsite.id = "detail-website-link";
        itemWebsite.iconEnd = "launch";
        itemWebsite.slot = "footer-actions";
        itemWebsite.scale = "l";
        itemWebsite.width = "full";
        itemWebsite.innerText = `Learn more`;
        itemWebsite.href = `${attributes["website"]}`;
        itemWebsite.rel = `noref noreferrer`;
        itemWebsite.target = `blank`;
        panel.appendChild(itemWebsite);
      }

      // const notice = document.createElement("calcite-notice");
      // notice.active = true;
      // notice.width = "full";

      // const message = document.createElement("span");
      // message.id = "overview-text";
      // message.slot = "message";
      // message.innerText = attributes["amenity"]
      //   ? attributes["amenity"]
      //   : "No overview available";

      // notice.appendChild(message);
      // blockOne.appendChild(notice);

      if (attributes["amenity"]) {
        const label = document.createElement("calcite-label");
        label.layout = "inline-space-between";
        label.innerText = "Amenity Type";
        const span = document.createElement("span");
        span.id = "amenity-type";
        span.innerText = `${handleCasing(attributes["amenity"])}`;
        label.append(span);
        blockOne.appendChild(label);
      }

      if (attributes["addr_street"]) {
        const label = document.createElement("calcite-label");
        label.layout = "inline-space-between";
        label.innerText = "Address";
        const span = document.createElement("span");
        span.id = "detail_address";
        span.innerText = `${attributes["addr_street"]} ${attributes["addr_housenumber"]}`
        label.append(span);
        blockTwo.appendChild(label);

        const label1 = document.createElement("calcite-label");
        label1.layout = "inline-space-between";
        label1.innerText = "Postcode";
        const span1 = document.createElement("span");
        span1.id = "detail_postcode";
        span1.innerText = `${attributes["addr_postcode"]}`
        label1.append(span1);
        blockTwo.appendChild(label1);        
        
        const label2 = document.createElement("calcite-label");
        label2.layout = "inline-space-between";
        label2.innerText = "City";
        const span2 = document.createElement("span");
        span2.id = "detail_city";
        span2.innerText = `${attributes["addr_city"]}` ? `${attributes["addr_city"]}` : ''
        label2.append(span2);
        blockTwo.appendChild(label2);
      }

      if (attributes["opening_hours"]) {
        const label3 = document.createElement("calcite-label");
        label3.layout = "inline-space-between";
        label3.innerText = "Opening hours";
        const span3 = document.createElement("span");
        span3.id = "detail_opening_hours";
        span3.innerText = `${attributes['opening_hours']}` ? `${attributes['opening_hours']}` : 'Not available';
        label3.append(span3);
        blockThree.appendChild(label3);
      }


      const labelWebsite = document.createElement("calcite-label");
      labelWebsite.layout = "inline-space-between";
      labelWebsite.innerText = "Website";
      const spanWebsite = document.createElement("span");
      spanWebsite.id = "detail-website";
      spanWebsite.innerText = `${attributes["website"]}`;
      labelWebsite.append(spanWebsite);
      blockFour.appendChild(labelWebsite);

      const labelPhone = document.createElement("calcite-label");
      labelPhone.layout = "inline-space-between";
      labelPhone.innerText = "Phone Number";
      const spanPhone = document.createElement("span");
      spanPhone.id = "detail-phone";
      spanPhone.innerText = attributes["phone"] ? `${attributes["phone"]}` : 'N/A';
      labelPhone.append(spanPhone);
      blockFour.appendChild(labelPhone);

      const labelRating = document.createElement("calcite-label");
      labelRating.layout = "inline-space-between";
      
      const yelpImg = document.createElement("img")
      yelpImg.src = `./img/yelp_logos/yelp_logo.png`
      yelpImg.height = "20"
      labelRating.appendChild(yelpImg);
      
      const ratingImg = document.createElement("img")
      ratingImg.src = `./img/yelp_stars/${yelpBusinessInfo['rating'] ? yelpBusinessInfo['rating'].toString().replace('.', '_') : '0' }.png`
      labelRating.append(yelpImg)
      labelRating.append(ratingImg)
      blockFive.append(labelRating)

      panel.appendChild(div); // Add the div for the scrollbar
      /* Add the blocks into the div */
      div.appendChild(blockOne);
      div.appendChild(blockTwo);
      div.appendChild(blockThree);
      div.appendChild(blockFour);
      div.appendChild(blockFive);

      flowNode.appendChild(panel);
    } else {
      /* replace existing element content */
      detailPanelNode.heading = handleCasing(attributes["name"]);

      document.getElementById(
        "detail-website-link"
      ).href = `http://${attributes["website"]}`;

      // document.getElementById("overview-text").innerText = attributes[
      //   "overview"
      // ]
      //   ? attributes["overview"]
      //   : "No overview available";

      document.getElementById(
        "amenity-type"
      ).innerText = `${attributes["amenity"]}`;

      document.getElementById("detail_address").innerText = 
        `${attributes["addr_street"]} ${attributes["addr_housenumber"]}`;

      document.getElementById("detail_postcode").innerText = 
      `${attributes["addr_postcode"]}`;

      document.getElementById("detail_city").innerText = 
      `${attributes["addr_city"]}`;

      document.getElementById("detail_opening_hours").innerText = `${
        attributes["opening_hours"] ? attributes["opening_hours"] : "N/A"
      }`;      

      document.getElementById("detail-website").innerText = `${
        attributes["website"] ? attributes["website"] : "N/A"
      }`;

      document.getElementById("detail-phone").innerText = `${
        attributes["phone"] ? attributes["phone"] : "N/A"
      }`;
    }
    view.goTo(
      {
        center: [result.geometry.longitude, result.geometry.latitude],
        zoom: 19,
      },
      { duration: 400 }
    );

    getAttachment(objectId, result);
  }

  // uh probably do this elsewhere
  function handleCasing(string = "") {
    if(string){
    return string
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
      .join(" ");}
      else {
        return ""
      }
  }

  function combineSQLStatements(where, sql, operator = "AND") {
    return where ? ` ${operator} (${sql})` : `(${sql})`;
  }

  function whereClause() {
    let where = "";

    if (appState.activeCuisineTypes.length > 0) {
      let cuisineWhere = "";
      const values = appState.activeCuisineTypes.flat();
      values.forEach(
        (value) =>
          (cuisineWhere += combineSQLStatements(
            cuisineWhere,
            `cuisine = '${value}'`,
            "OR"
          ))
      );
      where += combineSQLStatements(where, cuisineWhere);
    }

    const amenityTypeValue = amenityTypeNode.value;
    if (amenityTypeValue && amenityTypeValue !== appConfig.defaultAmenityType) {
      const values = amenityTypeValue.split(",");
      let amenityWhere = "";
      values.forEach(
        (value) =>
          (amenityWhere += combineSQLStatements(
            amenityWhere,
            `amenity = '${value}'`,
            "OR"
          ))
      );
      where += combineSQLStatements(where, amenityWhere);
    }

    return where;
  }

  function resetFilters() {
    amenityTypeNode.value = appConfig.defaultAmenityType;
    appState.walkingDistance = appConfig.walkingDistance;
    appState.walkingDistanceGraphic = null
    view.graphics.removeAll()
    walkingDistanceSliderNode.maxValue = appConfig.walkingDistance;
    walkingDistanceSliderNode.value = "0";
    appState.activeCuisineTypes = [];
    [...document.querySelectorAll(`[data-type*="type"]`)].forEach(
      (item) => (item.color = "grey")
    );
    appState.hasFilterChanges = false;
    queryItems();
  }

  function filterMap() {
    if (!amenityLayerView) {
      return;
    }

    const where = whereClause();

    amenityLayerView.featureEffect = {
      filter: {
        where: where,
        geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : undefined
      },
      excludedEffect: "grayscale(80%) opacity(30%)",
    };
  }

  function displayNoResult() {
    const notice = document.createElement("calcite-notice");
    notice.active = true;
    notice.width = "full";

    const message = document.createElement("span");
    message.slot = "message";
    message.innerText = "Reset filters or move the map";

    const title = document.createElement("span");
    title.slot = "title";
    title.innerText = "No results in view";

    notice.appendChild(title);
    notice.appendChild(message);
    resultsNode.appendChild(notice);
  }

  function displayResult(result) {
    if(result.attributes['name']){
      const attributes = result.attributes;
      const itemButton = document.createElement("button");
      itemButton.className = "item-button";
      const item = document.createElement("calcite-card");
      itemButton.appendChild(item);

      const chipState = document.createElement("calcite-chip");
      chipState.slot = "footer-leading";
      chipState.scale = "s";
      chipState.icon = "group";
      chipState.innerText = attributes["amenity"];
      item.appendChild(chipState);

      const title = document.createElement("span");
      title.slot = "title";
      title.innerText = handleCasing(attributes["name"]);
      item.appendChild(title);

      if(attributes["cuisine"]) {
        const summary = document.createElement("span");
        summary.slot = "subtitle";
        summary.innerText = handleCasing(attributes["cuisine"]);     
        item.appendChild(summary);
      }
      itemButton.addEventListener("click", () =>
        resultClickHandler(result.attributes[amenityLayer.objectIdField])
      );

      resultsNode.appendChild(itemButton);
    }
  }

  async function queryItems(start = 0) {
    resetNode.hidden = !appState.hasFilterChanges;
    resetNode.indicator = appState.hasFilterChanges;

    if (!amenityLayerView) {
      return;
    }

    resultBlockNode.loading = true;

    const where = whereClause();

    amenityLayerView.featureEffect = {
      filter: {
        where: where,
        geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : undefined
      },
      excludedEffect: "grayscale(80%) opacity(30%)",
    };

    await whenFalseOnce(amenityLayerView, "updating");

    if (start === 0) {
      appState.count = await amenityLayerView.queryFeatureCount({
        geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : view.extent.clone(),
        where,
      });
      paginationNode.total = appState.count;
      paginationNode.start = 1;
    }

    paginationNode.hidden = appState.count <= appConfig.pageNum;

    const results = await amenityLayerView.queryFeatures({
      start,
      num: appConfig.pageNum,
      geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : view.extent.clone(),
      where: whereClause(),
      outFields: [
        ...appConfig.amenityLayerOutFields,
        amenityLayer.objectIdField,
      ],
    });

    resultBlockNode.loading = false;

    resultBlockNode.summary = `${appState.count} locations found within the map.`;

    resultsNode.innerHTML = "";
    if (results.features.length) {
      results.features.map((result) => displayResult(result));
    } else {
      displayNoResult();
    }
  }

  const map = new WebMap({
    portalItem: {
      id: appConfig.webmap,
    },
  });

  const view = new MapView({
    container: "viewDiv",
    map,
    highlightOptions: {
      fillOpacity: 0,
      haloColor: "#D0D0D0",
    },
  });

  view.ui.add(
    new Home({
      view,
    }),
    "top-left"
  );

  view.ui.move("zoom", "top-left");

  const search = new Search({
    view,
    resultGraphicEnabled: false,
    popupEnabled: false,
  });

  const searchExpand = new Expand({
    view,
    content: search,
  });

  view.ui.add(searchExpand, "top-left");

  const legend = new Legend({
    view,
  });

  const legendExpand = new Expand({
    view,
    content: legend,
  });

  view.ui.add(legendExpand, "top-left");

  await view.when();


  const amenityLayer = view.map.layers.find(
    (layer) => layer.url === appConfig.amenityLayerUrl
  );

  if (!amenityLayer) {
    console.log('No layer was found')
    return;
  }

  await amenityLayer.load();

  amenityLayer.outFields = [
    ...appConfig.amenityLayerOutFields,
    amenityLayer.objectIdField,
  ];
  const amenityLayerView = await view.whenLayerView(amenityLayer);

  // View clicking
  view.on("click", async (event) => {
    const response = await view.hitTest(event);

    const results = response.results.filter(
      (result) =>
        result.graphic.sourceLayer?.id === amenityLayer.id &&
        !result.graphic.isAggregate
    );

    if (!results.length) {
      return;
    }

    const graphic = results[0].graphic;
    resultClickHandler(graphic.attributes[amenityLayer.objectIdField]);
  });

  // Init networkService
  // get the travel mode from the service
  networkService.fetchServiceDescription(routeServiceUrl, apiKeyArcGIS).then((result) => {

    travelMode = result.supportedTravelModes.find(
      (travelMode) => travelMode.name === "Walking Distance"
    );
    console.log("load complete");

    //if the travelmode is found set the loadComplete to true so the art can start
    loadComplete = true;
  });

  // Walking Time
  
  walkingDistanceSliderNode.maxValue = appConfig.walkingTime;
  walkingDistanceSliderNode.addEventListener("calciteSliderInput", (event) => {
    appState.walkingDistance = event.target.value;
    appState.hasFilterChanges = true;
  });
  walkingDistanceSliderNode.addEventListener("calciteSliderChange", async(event) => {
    appState.walkingDistance = event.target.value;
    appState.hasFilterChanges = true;
    await CreateDriveTimeAnalysis(Number.parseInt(event.target.value))

    queryItems();
    filterMap();
  });


  // Amenity type select
  for (const [key, value] of Object.entries(appConfig.AmenityTypes)) {
    const option = document.createElement("calcite-option");
    option.value = value;
    option.innerText = key;
    amenityTypeNode.appendChild(option);
  }
  amenityTypeNode.addEventListener("calciteSelectChange", () => {
    appState.hasFilterChanges = true;
    queryItems();
  });

  // Amenity type chip select
  for (const [key, value] of Object.entries(appConfig.cuisineTypes)) {
    const chip = document.createElement("calcite-chip");
    chip.tabIndex = 0;
    chip.dataset.type = "type";
    chip.value = value;
    chip.scale = "s";
    chip.innerText = handleCasing(key);
    chip.addEventListener("click", (event) =>
      handleMultipleChipSelection(event, value)
    );
    cuisineTypeNode.appendChild(chip);
  }

  function handleMultipleChipSelection(event, value) {
    let items = appState.activeCuisineTypes;
    if (!items.includes(value)) {
      items.push(value);
      event.target.color = "blue";
    } else {
      items = items.filter((item) => item !== value);
      event.target.color = "grey";
    }
    appState.activeCuisineTypes = items;
    appState.hasFilterChanges = true;
    queryItems();
  }

  async function CreateDriveTimeAnalysis (walkingDistance) {
      //only start the process if the load is complete (traveltimes have been fetched and layers have been created)
      if (loadComplete) {
        // create a graphic to show an the map and use as input 
        const start = new Graphic({
          geometry: view.center,
          symbol: {
            type: "simple-marker",
            color: "white",
            size: 8
          }
        });
        // add the graphic to the view
        view.graphics.removeAll();
        view.graphics.add(start);

        // create the service area parameters
        const serviceAreaParameters = new ServiceAreaParameters({
          apiKey: apiKeyArcGIS,
          facilities: new FeatureSet({
            features: [start]
          }),
          defaultBreaks: [walkingDistance],
          travelMode: travelMode,
          travelDirection: "from-facility",
          outSpatialReference: view.spatialReference

        });
        // solve the service area
        let serviceAreaSolveResult = await serviceArea.solve(routeServiceUrl, serviceAreaParameters)
        console.log("serviceAreaSolveResult", serviceAreaSolveResult);

        const serviceAreaPolygon = serviceAreaSolveResult.serviceAreaPolygons.features[0].geometry;
        
        const serviceAreaGraphic = new Graphic({
          geometry: serviceAreaPolygon,
          symbol: {
            type: "simple-fill",
            outline: { width: 1.5, color: [39, 175, 254, 1] },
            color: [0, 0, 0, 0]
          }
        });
        appState.walkingDistanceGraphic = serviceAreaGraphic
        view.graphics.add(serviceAreaGraphic)

      }
    }

  // handle theme swap
  themeNode.addEventListener("click", () => handleThemeChange());

  function handleThemeChange() {
    appState.activeItem = true;
    appState.theme = appState.theme === "dark" ? "light" : "dark";
    darkThemeCss.disabled = !darkThemeCss.disabled;
    if (appState.theme === "dark") {
      // Clear the basemap, and use the firefly tile layer
      map.basemap = 'satellite';
      document.body.className = "calcite-theme-dark";
      themeNode.icon = "moon";
    } else {
      map.basemap = "topo-vector";
      document.body.className = "";
      themeNode.icon = "brightness";
    }
    setTimeout(() => {
      appState.activeItem = false;
    }, 1000);
  }

  async function getBusinessInformationById (businessId) {
    try {
      const businessInfoResult = await fetch(
        `${urlYelpApiBusiness}${businessId}`, {
        headers: {
          Authorization: `Bearer ${apiKeyYelp}`
        }
      })
      const businessInfoJson = await businessInfoResult.json();
      return businessInfoJson
    } catch (error) {
      console.error('An error occured: ', error)  
    }
    return false
     

  }

  // Pagination
  paginationNode.num = appConfig.pageNum;
  paginationNode.start = 1;
  paginationNode.addEventListener("calcitePaginationChange", (event) => {
    queryItems(event.detail.start - 1);
  });

  // Reset button
  resetNode.addEventListener("click", () => resetFilters());

  // View extent changes
  view.watch("center", () => !appState.activeItem && queryItems());

  view.ui.add("toggle-snippet", "bottom-left");
  view.ui.add("code-snippet", "manual");

  queryItems();
}

init();
