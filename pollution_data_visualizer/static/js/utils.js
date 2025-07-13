(function(global){
  function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  function getAQIColor(aqi) {
    if (aqi <= 50) return '#009966';
    if (aqi <= 100) return '#ffde33';
    if (aqi <= 150) return '#ff9933';
    if (aqi <= 200) return '#cc0033';
    if (aqi <= 300) return '#660099';
    return '#7e0023';
  }

  function getAQIMessage(aqi) {
    if (aqi <= 50) return 'Air quality is considered satisfactory...';
    if (aqi <= 100) return 'Active children...limit prolonged exercise.';
    if (aqi <= 150) return 'Members of sensitive groups may experience health effects...';
    if (aqi <= 200) return 'Everyone may begin to experience health effects; members of sensitive groups...';
    if (aqi <= 300) return 'Health warnings of emergency conditions; entire population more likely to be affected...';
    return 'Everyone may experience more serious health effects; avoid all outdoor exertion.';
  }

  
  function markerColor(aqi){
    return getAQIColor(aqi);
  }

  if (typeof module !== 'undefined' && module.exports){
    module.exports = {
      markerColor,
      getAQIColor,
      getAQICategory,
      getAQIMessage
    };
  } else {
    global.markerColor = markerColor;
    global.getAQIColor = getAQIColor;
    global.getAQICategory = getAQICategory;
    global.getAQIMessage = getAQIMessage;
  }
})(typeof window !== 'undefined' ? window : global);
