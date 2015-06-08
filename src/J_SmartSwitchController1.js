var SMART_SWITCH_SID = 'urn:hugheaves-com:serviceId:SmartSwitch1';
var SMART_SWITCH_CONTROLLER_SID = 'urn:hugheaves-com:serviceId:SmartSwitchController1';
var SECURITY_SENSOR_SID = 'urn:micasaverde-com:serviceId:SecuritySensor1';
var SWITCH_SID = 'urn:upnp-org:serviceId:SwitchPower1';

var ssc_settingSid;
var ssc_settingVar;
var ssc_deviceId = 0;
var ssc_livedeviceIds;
var ssc_lastID;

function ssc_showSettings(deviceId) {
	var panelHtml = '';
	if (deviceId != ssc_lastID) {
		ssc_lastID = deviceId;
		ssc_livedeviceIds = null;
	}
	ssc_deviceId = deviceId;
	ssc_settingSid = SMART_SWITCH_CONTROLLER_SID;
	ssc_settingVar = 'SensorIds';
	
	panelHtml += '<p>To use this smart switch, you must add one or more motion sensors (or '
			+ 'other switches) that will act as the trigger for this switch.</p>';

	panelHtml += '<p>To add a trigger device, select a device from the drop-down '
			+ 'below and and click the "Add" button. To remove an '
			+ 'existing device, click the "Remove" button next to the device.</p>';

	panelHtml += '<p>To apply your changes, remember to click the "Reload Luup" button '
			+ 'at the bottom of the screen after adding or removing devices.</p>';

	panelHtml += ssc_deviceSelectDropdown(SECURITY_SENSOR_SID, SWITCH_SID);
	
	panelHtml += ssc_devicesTable();
	
	panelHtml += '<p><input type="button" value="Reload Luup" onclick="ssc_reload_luup()" /></p>';

	set_panel_html(panelHtml);
}

function ssc_dim_timeout(deviceId) {
	var panelHtml = '';

	ssc_deviceId = deviceId;
	ssc_settingSid = SMART_SWITCH_CONTROLLER_SID;
	ssc_settingVar = 'SensorIds';
	
	panelHtml += ssc_dimSelectDropdown('On Level');
	panelHtml += ssc_dimSelectDropdown('Off Level');
	panelHtml += ssc_timeoutSelectDropdown('Auto Timeout');
	panelHtml += ssc_timeoutSelectDropdown('Manual Timeout');

	set_panel_html(panelHtml);
	
	ssc_GetValues();
	

}

/*
 * Generic (Shared) functions
 */

function ssc_findDevices(sid1, sid2) {
	var foundDevices = [];

	var devices = jsonp.ud.devices;

	for ( var i = 0; i < devices.length; i++) {
		var device = devices[i];
		var found = false;

		for ( var j = 0; j < device.states.length; j++) {
			var state = device.states[j];
			if (state.service == sid1 || state.service == sid2) {
				found = true;
			}
		}

		if (found) {
			foundDevices.push(device);
		}

	}
	return foundDevices;
}

function ssc_removeUsedDevices(devices) {
	var deviceIds = ssc_getDeviceIdsSetting();
	var newDevices = [];
	
	for ( var i = 0; i < devices.length; ++i) {
		var device = devices[i];
		var index = deviceIds.indexOf(device.id);
		if (index == -1) {
			newDevices.push(device);
		}
	}
	
	return newDevices;
}

function ssc_getDeviceIdsSetting() {
	//TIAAN was here
	//Adapted this function to use a temp global variable to show live version of device list
	//otherwise you cannot see added device immediately
	if (ssc_livedeviceIds != null) {
		return ssc_livedeviceIds;
	}

	var deviceIdsJSON = get_device_state(ssc_deviceId, ssc_settingSid,
			ssc_settingVar, 0);

	deviceIdsJSON = deviceIdsJSON.replace(/'/g, '\"');

	if (deviceIdsJSON == "") {
		return ([]);
	} else {
		ssc_livedeviceIds = JSON.parse(deviceIdsJSON);
		return (JSON.parse(deviceIdsJSON));
	}
}

function ssc_setDeviceIdsSetting(deviceIds) {
	var deviceIdsJSON = JSON.stringify(deviceIds);

	deviceIdsJSON = deviceIdsJSON.replace(/"/g, '\'');

	set_device_state(ssc_deviceId, ssc_settingSid, ssc_settingVar, deviceIdsJSON, 0);
}

function ssc_deviceSelectDropdown(sid1, sid2) {
	var panelHtml = '';

	var devices = ssc_findDevices(sid1, sid2);
	devices = ssc_removeUsedDevices(devices);

	panelHtml += '<select id="deviceSelect">'
	panelHtml += '<option value="0">-- Select a device --</option>'
	for ( var i = 0; i < devices.length; ++i) {
		var device = devices[i];
		panelHtml += '<option value="' + device.id + '">' + device.name + ' (#'
				+ device.id + ')</option>';

	}
	panelHtml += '</select>';
	panelHtml += '<input type="button" value="Add" onclick="ssc_addSelectedDevice()" />';
	panelHtml += '<p/>';

	return panelHtml;
}

function ssc_timeoutSelectDropdown(label) {
	var panelHtml = '';
	var name = label.replace(" ","_");
	panelHtml += '<div class="control-group">';
    panelHtml += '<label class="control-label" for="selectbasic">' + label + '</label>';
	panelHtml += '<div class="controls">';
    panelHtml += '<select id="' + name + '" name="selectbasic" class="input-xlarge" onchange="ssc_UpdateValues()">';
	panelHtml += '<option value="0">None</option>';
	panelHtml += '<option value="30">30s</option>';
	panelHtml += '<option value="60">1m</option>';
	panelHtml += '<option value="120">2m</option>';
	panelHtml += '<option value="300">5m</option>';
	panelHtml += '<option value="900">15m</option>';
	panelHtml += '<option value="1800">30m</option>';
	panelHtml += '<option value="3600">1h</option>';
	panelHtml += '<option value="7200">2h</option>';
	panelHtml += '<option value="21600">6h</option>';
	panelHtml += '<option value="43200">12h</option>';
	panelHtml += '<option value="86400">24h</option>';
	panelHtml += '</select>';
	panelHtml += '</div>';
	panelHtml += '</div>';
	
	panelHtml += '<p/>';

	return panelHtml;
}

function ssc_dimSelectDropdown(label) {
	var panelHtml = '';
	var name = label.replace(" ","_");
	panelHtml += '<div class="control-group">';
    panelHtml += '<label class="control-label" for="selectbasic">' + label + '</label>';
	panelHtml += '<div class="controls">';
    panelHtml += '<select id="' + name + '" name="selectbasic" class="input-xlarge" onchange="ssc_UpdateValues()">';
	panelHtml += '<option value="0">Off</option>';
	panelHtml += '<option value="5">5%</option>';
	panelHtml += '<option value="10">10%</option>';
	panelHtml += '<option value="20">20%</option>';
	panelHtml += '<option value="30">30%</option>';
	panelHtml += '<option value="40">40%</option>';
	panelHtml += '<option value="50">50%</option>';
	panelHtml += '<option value="60">60%</option>';
	panelHtml += '<option value="70">70%</option>';
	panelHtml += '<option value="80">80%</option>';
	panelHtml += '<option value="90">90%</option>';
	panelHtml += '<option value="100">100%</option>';
	panelHtml += '</select>';
	panelHtml += '</div>';
	panelHtml += '</div>';
	
	panelHtml += '<p/>';

	return panelHtml;
}

function ssc_get_device_by_id(DeviceID) {
//Wrote this function because the jsonp version does not work for some reason.
	var devices = ssc_findDevices(SECURITY_SENSOR_SID, SWITCH_SID);
	
	for ( var i = 0; i < devices.length; ++i) {
		if (devices[i].id == DeviceID){
			return devices[i];
		}
		
	}

	return device;
}

function ssc_get_room_by_id(RoomID) {
//Wrote this function because the jsonp version does not work for some reason.
	var rooms = jsonp.ud.rooms;
	
	for ( var i = 0; i < rooms.length; ++i) {
		if (rooms[i].id == RoomID){
			return rooms[i];
		}
		
	}

	return room;
}

function ssc_devicesTable() {
	var panelHtml = '';

	panelHtml += ssc_tableHeader();

	var deviceIds = ssc_getDeviceIdsSetting();

	for ( var i = 0; i < deviceIds.length; ++i) {
		device = ssc_get_device_by_id(deviceIds[i]);
		panelHtml += ssc_tableRow(device);
	}

	panelHtml += ssc_tableFooter();

	return panelHtml;
}

function ssc_tableHeader() {
	var panelHtml = '';

	panelHtml += '<table style="border-collapse:collapse">';
	panelHtml += '<tr>';
	panelHtml += '<th style="width: 20%">Device Id</th>';
	panelHtml += '<th style="width: 20%">Room</th>';
	panelHtml += '<th style="width: 50%">Name</th>';
	panelHtml += '<th style="width: 20%">Action</th>';
	panelHtml += '</tr>';

	return panelHtml;
}

function ssc_tableRow(device) {
	var panelHtml = '';
	var roomName = 'none';

	if (device.room > 0) {
		roomName = ssc_get_room_by_id(device.room).name;
	}

	panelHtml += '<tr style="border: 1px solid black">';
	panelHtml += '<td style="border: 1px solid black">' + device.id + '</td>';
	panelHtml += '<td style="border: 1px solid black">' + roomName + '</td>';
	panelHtml += '<td style="border: 1px solid black">' + device.name + '</td>';
	panelHtml += '<td style="border: 1px solid black"><input type="button" value="Remove" '
			+ 'onclick="ssc_removeDevice(\'' + device.id + '\')" /></td>';
	panelHtml += '</tr>';

	return panelHtml;
}

function ssc_tableFooter() {
	return '</table>';
}

function ssc_removeDevice(deviceId) {
	var deviceIds = ssc_getDeviceIdsSetting();
	var index = deviceIds.indexOf(deviceId);
	if (index > -1) {
		deviceIds.splice(index, 1);
		ssc_setDeviceIdsSetting(deviceIds);
		ssc_showSettings(ssc_deviceId);
	}
}

function ssc_addSelectedDevice() {
	var element = document.getElementById("deviceSelect");
	var deviceId = element.options[element.selectedIndex].value;
	var deviceIds = ssc_getDeviceIdsSetting();
	var index = deviceIds.indexOf(deviceId);
	if (index == -1 && deviceId > 0) {
		deviceIds.push(deviceId);
		ssc_setDeviceIdsSetting(deviceIds);
		ssc_showSettings(ssc_deviceId);
	}
}

function ssc_SetElementIndexByValue(element, value) {

	for(var i = 0, j = element.options.length; i < j; ++i) {
        if(element.options[i].value == value) {
           return i;
           break;
        }
	}
}

function ssc_GetValues() {
	var element = document.getElementById("On_Level");
	var Value = get_device_state(ssc_deviceId, ssc_settingSid, "OnLevel", 0);	
	element.selectedIndex = ssc_SetElementIndexByValue(element, Value);

	element = document.getElementById("Off_Level");
	Value = get_device_state(ssc_deviceId, ssc_settingSid, "OffLevel", 0);	
	element.selectedIndex = ssc_SetElementIndexByValue(element, Value);
	
	element = document.getElementById("Auto_Timeout");
	Value = get_device_state(ssc_deviceId, ssc_settingSid, "AutoTimeout", 0);	
	element.selectedIndex = ssc_SetElementIndexByValue(element, Value);
	
	element = document.getElementById("Manual_Timeout");
	Value = get_device_state(ssc_deviceId, ssc_settingSid, "ManualTimeout", 0);	
	element.selectedIndex = ssc_SetElementIndexByValue(element, Value);

}

function ssc_UpdateValues() {
	//'On Level'
	//'Off Level'
	//'Auto Timeout'
	//'Manual Timeout'

	var element = document.getElementById("On_Level");
	var OnLevelValue = element.options[element.selectedIndex].value;
	element = document.getElementById("Off_Level");
	var OffLevelValue = element.options[element.selectedIndex].value;
	element = document.getElementById("Auto_Timeout");
	var AutoTimeoutValue = element.options[element.selectedIndex].value;
	element = document.getElementById("Manual_Timeout");
	var ManualTimeoutValue = element.options[element.selectedIndex].value;
	
	set_device_state(ssc_deviceId, ssc_settingSid, "OnLevel", OnLevelValue, 0);
	set_device_state(ssc_deviceId, ssc_settingSid, "OffLevel", OffLevelValue, 0);
	set_device_state(ssc_deviceId, ssc_settingSid, "AutoTimeout", AutoTimeoutValue, 0);
	set_device_state(ssc_deviceId, ssc_settingSid, "ManualTimeout", ManualTimeoutValue, 0);
	
}

function ssc_reload_luup() {
	//TODO  how to call luup.reload here
	application.luReload(); //I think this will cause UI7 to reload on it own!!
}
