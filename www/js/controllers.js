angular.module('starter.controllers', [])

.controller('MapCtrl', function($scope, $ionicLoading, leaflyService) {
  $scope.menuView = false;

  $scope.mapCreated = function(map) {
    
    var mapOptions = {
          center: new google.maps.LatLng(37.7749295, -122.41941550000001),
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
    
    var input = /** @type {HTMLInputElement} */(document.getElementById('pac-input'));

    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    var infowindow = new google.maps.InfoWindow();
    // place marker at center of search
    var marker = placeMark(map, mapOptions.center);

    /** Autocomplete function on Google map location search */
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      infowindow.close();
      marker.setVisible(false);

      clearMarkers($scope.markers);

      var place = autocomplete.getPlace();
      if (!place.geometry) {
        window.alert("Autocomplete's returned place contains no geometry");
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(11);  // Why 17? Because it looks good.
      }

      marker.setPosition(place.geometry.location);
      marker.setVisible(true);

      $scope.selectedRegion = place.geometry.location;
      
      if ($scope.selector) $scope.getRestriction();

      var address = '';
      if (place.address_components) {
        address = [
          (place.address_components[0] && place.address_components[0].short_name || ''),
          (place.address_components[1] && place.address_components[1].short_name || ''),
          (place.address_components[2] && place.address_components[2].short_name || '')
        ].join(' ');
      }

      infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address);
      infowindow.open(map, marker);

      $scope.getDistribution();

      $scope.map = map;
    });
    /** End Autocomplete function on Google map location search */

    
    $scope.map = map;
    
    $scope.centerOnMe();

    $scope.selectedRegion = $scope.map.center;

    $scope.getDistribution();
  };

  $scope.centerOnMe = function () {
    if (!$scope.map) {
      return;
    }

    $scope.loading = $ionicLoading.show({
      content: 'Getting current location...',
      showBackdrop: false
    });

    navigator.geolocation.getCurrentPosition(function (pos) {
      $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
      $scope.loading.hide();
    }, function (error) {
      alert('Unable to get location: ' + error.message);
      $scope.loading.hide();
    });
  };

  $scope.toggleMenu = function () {
    $scope.menuView = !$scope.menuView;
  };

  $scope.getDistribution = function () {
    $scope.menuView = false;

    clearMarkers($scope.markers);
    if ($scope.selector) {
      if ($scope.selector == "strains") {
        leaflyService.getStrains().then(function (response){
          console.log("service success");
        });
      }
      else {
        leaflyService.getLocations($scope.selectedRegion, $scope.selector).then(function (response) {
          if (response.data.stores) {
            markRestrictions(response.data.stores);
          }
        });
      }
    }
    else {
      leaflyService.getLocations($scope.selectedRegion).then(function (response) {
        if (response.data.stores) {
          markRestrictions(response.data.stores);
        }
      });
    }

      
  };

  function placeMark(map, position, markIcon) {
    var marker = new google.maps.Marker({
          map: map,
          position: position,
          visible: true
        });

    if (markIcon) {
      marker.setIcon(markIcon);
    }

    return marker;
  }

  function markRestrictions(locations) {
    // Loop through our array of markers & place each one on the map 
    if (locations) {
      var bounds = new google.maps.LatLngBounds();
      var markers = [];
      var infoWindow = new google.maps.InfoWindow();
                
      locations.forEach(function(item) {
        infoWindow.close();
        var position = new google.maps.LatLng(item.latitude, item.longitude);
        bounds.extend(position);

        var marker = placeMark($scope.map, position, "http://maps.google.com/mapfiles/ms/icons/blue-dot.png");
        markers.push(marker);
        
        // Allow each marker to have an info window
        google.maps.event.addListener(marker, 'click', (function(marker) {
            return function() {
                var infoContent = '<img class="info" src="' + item.logo + '" width="50" style="float: left" />';
                infoContent += '<div class="info" style="float:left">\
                                  <img class="usl" src="img/WMmarker.png" "width= 50" style="float:right"/>\
                                  <h4 style="margin-top:0">' + item.name + '</h4>\
                                  <h5 style="margin:0">' + item.address + ', ' + item.locationLabel + '</h5>\<br>\
                                  <h6>\<a href="tel:' + item.phone + '">' + item.phone + '</a>\</h6>\
                                </div>';
                infoWindow.setContent(infoContent);
                infoWindow.open($scope.map, marker);
            }
        })(marker, item.id));

        // Automatically center the map fitting all markers on the screen
        $scope.map.fitBounds(bounds);
      });

      // Override our map zoom level once our fitBounds function runs (Make sure it only runs once)
      var boundsListener = google.maps.event.addListener(($scope.map), 'bounds_changed', function(event) {
          this.setZoom(11);
          google.maps.event.removeListener(boundsListener);
      });

      $scope.markers = markers;
    }

    $scope.map.setCenter($scope.selectedRegion)
  }

  function clearMarkers(markers) {
    if (markers) {
      markers.forEach(function(marker) {
        marker.setMap(null);
        marker.setVisible(false);
      });

      $scope.markers = [];
    }
  }

})

.factory('leaflyService', function($http) {
  $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
  $http.defaults.headers.post["app_id"] = "32488d31";
  $http.defaults.headers.post["app_key"] = "514c317ccb2edfd531acaa8b2c220dcd";
  return {
    getStrains: function () {
      return $http.post('//data.leafly.com/strains', {
        "Page":0,
        "Take":50
      })
    },

    getLocations: function (position, selector) {
      var params = "page=0&take=50"

      if (position && position.lat() && position.lng()){
        params += "&latitude=" + position.lat() + "&longitude=" + position.lng();
      }
      
      if (selector) {
        params += "&" + selector + "=true";
      }

      return $http.post('//data.leafly.com/locations', params);
    }

  }
});