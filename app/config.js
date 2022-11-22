export const appConfig = {
  webmap: "a2f2ca137c7f4103a74ea2d8652f7d78", //"8e3d0497739a4c819d086ab59c3912d5",
  defaultAmenityType: "all",
  AmenityTypes: {
    "Restaurant": "restaurant",
    "Pub": "pub",
    "Fastfood": "fast_food",
    "Cafe": "cafe",
    "Bar": "bar"
  },
  cuisineTypes: {
    "italian": "italian",
    "german": "german",
    "indian": "indian",
    "pizza": "pizza",
    "regional": "regional",
    "vietnamese": "vietnamese",
    "greek": "greek",
    "asian": "asian",
    "coffee_shop": "coffee_shop",
    "burger": "burger",
    "sushi": "sushi",
    "chinese": "chinese",
    "french": "french",
    "international": "international",
    "mexican": "mexican",
    "japanese": "japanese",
    "steak_house": "steak_house"
  },
  pageNum: 25,
  amenityLayerUrl:
    "https://services8.arcgis.com/HXXlNVZJvhHvUbuu/arcgis/rest/services/OSM_Amenities_POI_Berlin_Food_Drinks/FeatureServer", //"https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/US_Colleges_and_Universities/FeatureServer",
  amenityLayerOutFields: [
    "osm_id2",
    "access",
    "addr_housename",
    "addr_housenumber",
    "addr_street",
    "addr_postcode",
    "addr_city",
    "amenity",
    "cuisine",
    "name",
    "opening_hours",
    "phone",
    "website",
    "shop",
    "yelp"  
  ],
  walkingDistance: "0"
};
