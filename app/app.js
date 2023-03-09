import WebMap from "https://js.arcgis.com/4.25/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/4.25/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.25/@arcgis/core/layers/FeatureLayer.js";
import Home from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Home.js";
import Legend from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Legend.js";
import Search from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Search.js";
import Expand from "https://js.arcgis.com/4.25/@arcgis/core/widgets/Expand.js";
import { whenFalseOnce } from "https://js.arcgis.com/4.25/@arcgis/core/core/watchUtils.js";

import * as networkService from "https://js.arcgis.com/4.25/@arcgis/core/rest/networkService.js";
import Graphic from " https://js.arcgis.com/4.25/@arcgis/core/Graphic.js";
import ServiceAreaParameters from "https://js.arcgis.com/4.25/@arcgis/core/rest/support/ServiceAreaParameters.js";
import FeatureSet from "https://js.arcgis.com/4.25/@arcgis/core/rest/support/FeatureSet.js";
import * as serviceArea from "https://js.arcgis.com/4.25/@arcgis/core/rest/serviceArea.js";

import { appConfig } from "./config.js";
import { appState } from "./state.js";

async function init() {
  const allowedCodes = appConfig.allowedPoiTypeCodes;
  // query for elements
  const resultsNode = document.getElementById("results");
  const walkingDistanceSelectionNode = document.getElementById("walkingDistanceSelection");
  const poiSelectionNode = document.getElementById("poiSelection");
  const resultBlockNode = document.getElementById("resultBlock");
  const paginationNode = document.getElementById("pagination");
  const filtersNode = document.getElementById("filters");
  const resetNode = document.getElementById("reset");
  const flowNode = document.getElementById("flow");
  const themeNode = document.getElementById("themeToggle");
  const darkThemeCss = document.getElementById("jsapi-theme-dark");

  /* ArcGIS Location Services */
  const apiKeyArcGIS = ""
  const routeServiceUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";
  let travelMode = null;
  var loadComplete = false;

  // display requested item data
  // handle flow destroying dom of added panel...
  async function resultClickHandler(objectId) {
    appState.savedExtent = view.extent.clone();
    appState.activeItem = true;

    await whenFalseOnce(lodgingLayerView, "updating");

    const { features } = await lodgingLayerView.queryFeatures({
      returnGeometry: true,
      outSpatialReference: view.spatialReference,
      objectIds: [objectId],
      outFields: appConfig.lodgingLayerOutFields,
    });

    const result = features[0];

    if (!result.geometry || !result.attributes) {
      return;
    }

    filtersNode.hidden = true;
    const attributes = result.attributes;
    const detailFlowItemNode = document.getElementById("detail-flow-item");
    // a janky way to replace content in a single panel vs appending entire new one each time
    if (!detailFlowItemNode) {
      const flowItem = document.createElement("calcite-flow-item");
      flowItem.heading = handleCasing(attributes["name"]);
      flowItem.id = "detail-flow-item";
      flowItem.addEventListener("calciteFlowItemBack", async () => {
        if (appState.savedExtent) {
          await view.goTo(appState.savedExtent);
          appState.savedExtent = null;
        }
        appState.activeItem = false;
        filtersNode.hidden = false;
      });

      // TODO: revisit all of this!

      // Contain the calcite-block elements for the scrollbar
      const div = document.createElement("div");
      div.classList.add("calcite-panel-contents");

      const blockOne = document.createElement("calcite-block");
      blockOne.classList.add("calcite-block-contents");
      blockOne.heading = "House overview";
      blockOne.collapsible = true;
      blockOne.open = true;

      const blockTwo = document.createElement("calcite-block");
      blockTwo.classList.add("calcite-block-contents");
      blockTwo.heading = "Amenities";
      blockTwo.collapsible = true;
      blockTwo.open = true;

      const blockThree = document.createElement("calcite-block");
      blockThree.classList.add("calcite-block-contents");
      blockThree.heading = "Host";
      blockThree.collapsible = false;
      blockThree.open = true;

      const blockFour = document.createElement("calcite-block");
      blockFour.classList.add("calcite-block-contents");
      blockFour.heading = "Rating";
      blockFour.collapsible = false;
      blockFour.open = true;

      const listingImageNode = document.createElement("img");
      listingImageNode.src = attributes["picture_url"];
      listingImageNode.width = 300;

      const descriptionText = document.createElement("p");
      descriptionText.innerHTML = attributes["description"];
      descriptionText.id = "detail-description";

      function createLabel(text, valueOrNode, valueId) {
        const label = document.createElement("calcite-label");
        label.layout = "inline-space-between";
        label.innerText = text;

        const content = document.createElement("span");
        content.id = valueId;

        if (valueOrNode instanceof HTMLElement) {
          content.append(valueOrNode);
        } else {
          content.innerHTML = valueOrNode || 'N/A';
        }

        label.append(content);

        return label;
      }

      function createYesNoIcon(value) {
        const icon = document.createElement("calcite-icon");
        icon.icon = value === "f" ? "x-circle" : "check-circle";
        return icon;
      }

      blockOne.append(listingImageNode);
      blockOne.append(descriptionText);
      blockOne.append(createLabel("Price", attributes["price"], "detail-price"));
      blockOne.append(createLabel("Property type", attributes["property_type"], "detail-property-type"));
      blockOne.append(createLabel("Room type", attributes["room_type"], "detail-room-type"));
      blockOne.append(createLabel("Accommodates", attributes["accommodates"], "detail-accommodates"));
      blockOne.append(createLabel("Bedrooms", attributes["bedrooms"], "detail-bedrooms"));
      blockOne.append(createLabel("Beds", attributes["beds"], "detail-beds"));
      blockOne.append(createLabel("Bathrooms", attributes["bathrooms"], "detail-bathrooms"));
      blockOne.append(createLabel("Bathrooms Misc", attributes["bathrooms_text"], "detail-bathrooms-misc"));
      blockOne.append(createLabel("Available", createYesNoIcon(attributes["has_availability"]), "detail-available"));

      if (attributes["listing_url"]) {
        const itemWebsite = document.createElement("calcite-button");
        itemWebsite.id = "detail-website-link";
        itemWebsite.iconEnd = "launch";
        itemWebsite.slot = "footer-actions";
        itemWebsite.scale = "l";
        itemWebsite.width = "full";
        itemWebsite.innerText = `Learn more`;
        itemWebsite.href = `${attributes["listing_url"]}`;
        itemWebsite.rel = `noref noreferrer`;
        itemWebsite.target = `blank`;
        flowItem.append(itemWebsite);
      }

      const amenitiesText = attributes["amenities"];
      if (amenitiesText) {
        const amenities = JSON.parse(amenitiesText);
        const amenitiesList = document.createElement("calcite-list");

        amenitiesList.append(...amenities.map((amenity) => {
          const amenityItem = document.createElement("calcite-list-item");
          amenityItem.label = amenity;
          return amenityItem;
        }));

        const amenitiesScroller = document.createElement("div");
        amenitiesScroller.classList.add("scroller");
        amenitiesScroller.append(amenitiesList);

        blockTwo.append(amenitiesScroller);
      }

      const hostName = createLabel("Name", attributes["host_name"], "detail-host-name");
      const hostAbout = createLabel("About", attributes["host_about"], "detail-host-about");

      const avatar = document.createElement("calcite-avatar");
      avatar.id = "detail-host-avatar";
      avatar.thumbnail = attributes["host_thumbnail_url"];

      const hostAvatar = createLabel("About", avatar);
      const hostLocation = createLabel("Location", attributes["host_location"], "detail-host-location");
      const hostVerified = createLabel("Verified", createYesNoIcon(attributes["host_verified"]), "detail-host-verified");
      const hostIsSuper = createLabel("Is superhost", createYesNoIcon(attributes["host_is_superhost"]), "detail-host-is-super");

      const hostUrl = document.createElement("calcite-link");
      hostUrl.id = "detail-host-url";
      hostUrl.href = attributes["host_url"];
      const hostLink = createLabel("Learn more", hostUrl);
      blockThree.append(hostName, hostAbout, hostAvatar, hostLocation, hostVerified, hostIsSuper, hostLink);

      const labelRating = document.createElement("calcite-label");
      labelRating.layout = "inline-space-between";

      const rating = document.createElement("calcite-rating")
      rating.id = "detail-rating";
      rating.readOnly = true;
      rating.count = attributes['number_of_reviews'];
      rating.showChip = true;
      rating.value = attributes['review_scores_rating'];

      labelRating.append(rating)
      blockFour.append(labelRating)

      flowItem.append(div);
      div.append(blockOne, blockTwo, blockThree, blockFour);
      flowNode.append(flowItem);
    }

    view.goTo(
      {
        center: [result.geometry.longitude, result.geometry.latitude],
        zoom: 19,
      },
      { duration: 400 }
    );
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

  function resetFilters() {
    poiSelectionNode.selectedItems[0].selected = false;
    appState.walkingDistance = appConfig.walkingDistance;
    appState.walkingDistanceGraphic = null
    view.graphics.removeAll()
    walkingDistanceSelectionNode.maxValue = appConfig.walkingDistance;
    walkingDistanceSelectionNode.value = "0";
    [...document.querySelectorAll(`[data-type*="type"]`)].forEach(
      (item) => (item.color = "grey")
    );
    appState.hasFilterChanges = false;
    queryItems();
  }

  function filterMap() {
    if (!lodgingLayerView) {
      return;
    }

    lodgingLayerView.featureEffect = {
      filter: {
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

    notice.append(title);
    notice.append(message);
    resultsNode.append(notice);
  }

  function displayResult(result) {
    if(result.attributes['name']){
      const attributes = result.attributes;
      const itemButton = document.createElement("button");
      itemButton.className = "item-button";
      const item = document.createElement("calcite-card");
      itemButton.append(item);

      const thumbnail = document.createElement("img");
      thumbnail.src = attributes["picture_url"];
      thumbnail.height = 150;
      thumbnail.slot = "thumbnail";
      item.append(thumbnail);

      const chipState = document.createElement("calcite-chip");
      chipState.slot = "footer-start";
      chipState.scale = "s";
      chipState.icon = "group";
      chipState.innerText = attributes["property_type"];
      item.append(chipState);

      const title = document.createElement("span");
      title.slot = "title";
      title.innerText = handleCasing(attributes["name"]);
      item.append(title);

      itemButton.addEventListener("click", () =>
        resultClickHandler(result.attributes[lodgingLayer.objectIdField])
      );

      resultsNode.append(itemButton);
    }
  }

  async function queryItems(start = 0) {
    resetNode.hidden = !appState.hasFilterChanges;
    resetNode.indicator = appState.hasFilterChanges;

    if (!lodgingLayerView) {
      return;
    }

    resultBlockNode.loading = true;

    lodgingLayerView.featureEffect = {
      filter: {
        geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : undefined
      },
      excludedEffect: "grayscale(80%) opacity(30%)",
    };

    await whenFalseOnce(lodgingLayerView, "updating");

    if (start === 0) {
      appState.count = await lodgingLayerView.queryFeatureCount({
        geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : view.extent.clone(),
      });
      paginationNode.totalItems = appState.count;
      paginationNode.startItem = 1;
    }

    paginationNode.hidden = appState.count <= appConfig.pageNum;

    const results = await lodgingLayerView.queryFeatures({
      start,
      num: appConfig.pageNum,
      geometry: appState.walkingDistanceGraphic ? appState.walkingDistanceGraphic.geometry : view.extent.clone(),
      outFields: [
        ...appConfig.lodgingLayerOutFields,
        lodgingLayer.objectIdField,
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

  const lodgingLayer = view.map.layers.find(
    (layer) => layer.url === appConfig.lodgingLayerUrl
  );

  if (!lodgingLayer) {
    console.log('No layer was found')
    return;
  }

  const poiLayer = new FeatureLayer("https://services1.arcgis.com/1vIhDJwtG5eNmiqX/arcgis/rest/services/Places/FeatureServer/0");

  await lodgingLayer.load();
  await poiLayer.load();

  filtersNode.loading = true;

  const pois = await poiLayer.queryFeatures({
    where: allowedCodes.map(code => `TYPE = '${code}'`).join(" OR "),
    geometry: view.extent.clone(),
    outFields: ["NAME", "OBJECTID"]
  });

  poiSelectionNode.filterEnabled = false;

  poiSelectionNode.replaceChildren(
    ...pois.features.map(poi => {
      const item = document.createElement("calcite-list-item");
      item.label = poi.attributes.NAME;
      item.value = poi.attributes.OBJECTID;
      return item;
    })
  );

  poiSelectionNode.filterEnabled = true;
  filtersNode.loading = false;


  lodgingLayer.outFields = [
    ...appConfig.lodgingLayerOutFields,
    lodgingLayer.objectIdField,
  ];
  const lodgingLayerView = await view.whenLayerView(lodgingLayer);

  // View clicking
  view.on("click", async (event) => {
    const response = await view.hitTest(event);

    const results = response.results.filter(
      (result) =>
        result.graphic.sourceLayer?.id === lodgingLayer.id &&
        !result.graphic.isAggregate
    );

    if (!results.length) {
      return;
    }

    const graphic = results[0].graphic;
    resultClickHandler(graphic.attributes[lodgingLayer.objectIdField]);
  });

  // Init networkService
  // get the travel mode from the service
  networkService.fetchServiceDescription(routeServiceUrl, apiKeyArcGIS).then((result) => {

    travelMode = result.supportedTravelModes.find(
      (travelMode) => travelMode.name === "Walking Distance"
    );

    //if the travelmode is found set the loadComplete to true so the art can start
    loadComplete = true;
  });

  // Walking Time

  poiSelectionNode.addEventListener("calciteListItemSelect", async (event) => {
    appState.activePoi = (await poiLayer.queryFeatures({
      objectIds: [event.target.value],
      returnGeometry: true
    })).features[0];

    updateWalkingTimeResults();
  });

  walkingDistanceSelectionNode.addEventListener("calciteSliderInput", (event) => {
    appState.walkingDistance = event.target.value;
    appState.hasFilterChanges = true;
    filterMap();
  });

  walkingDistanceSelectionNode.addEventListener("calciteSliderChange", async (event) => {
    appState.walkingDistance = Number(event.target.value);
    appState.hasFilterChanges = true;
    updateWalkingTimeResults();
  });

  async function updateWalkingTimeResults() {
    if (!appState.walkingDistance || !appState.activePoi.geometry) {
      return;
    }

    await CreateWalkTimeAnalysis(appState.walkingDistance, appState.activePoi.geometry);
    queryItems();
  }

  async function CreateWalkTimeAnalysis (walkingDistance, location) {
      //only start the process if the load is complete (traveltimes have been fetched and layers have been created)
      if (loadComplete) {
        // create a graphic to show an the map and use as input
        const start = new Graphic({
          geometry: location,
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
      document.body.className = "calcite-mode-dark";
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

  // Pagination
  paginationNode.pageSize = appConfig.pageNum;
  paginationNode.startItem = 1;
  paginationNode.addEventListener("calcitePaginationChange", (event) => queryItems(event.target.startItem - 1));

  // Reset button
  resetNode.addEventListener("click", () => resetFilters());

  // View extent changes
  view.watch("center", () => !appState.activeItem && queryItems());

  view.ui.add("toggle-snippet", "bottom-left");
  view.ui.add("code-snippet", "manual");

  queryItems();
}

init();
