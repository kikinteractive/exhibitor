$(function() {
	// Stop the NetFlix eye bleed.
	$('head').append('<link rel="stylesheet" href="kik/css/kik.css">');

	var kik_tab_id = 'tabs-kik-config';

	var kikConfigData;

	function addKikConfigTab() {
		var sb = [];
		sb.push('<div id="');
		sb.push(kik_tab_id);
		sb.push('" class="ui-helper-hidden">');
		sb.push('<div id="kikconfig-group">');
		sb.push('<fieldset>');
		sb.push('<legend>Environment</legend>');

		sb.push('<label for="configEnv">Environment</label>');
		sb.push('<select id="configEnv">');
		sb.push('<option value="betaclik" selected>BETA</option>');
		sb.push('<option value="clik">PROD</option>');
		sb.push('</select>');
		sb.push('<br clear="all" />');

		sb.push('<label for="configType">Server type</label>');
		sb.push('<select id="configType">');
		sb.push('<option value="conference" selected>CONFERENCE</option>');
		sb.push('<option value="ctrl">CONTROL</option>');
		sb.push('</select>');
		sb.push('</fieldset>');
		sb.push('</div>');

		sb.push('<div id="configTable">Config table gets rendered here...</div>');

		sb.push('</div>');

		$('#tabs').append(sb.join(''));
		$('#tabs-list').append('<li><a href="#' + kik_tab_id + '">' + 'KikConfig' + '</a></li>');
	}

	function fetchKikConfig() {
		var env = $("#configEnv").val();
		var type = $("#configType").val();

		var zkPath = '/' + env + '/config/' + type + '/meta';
		console.log(zkPath);
		$.ajax({
			url : URL_EXPLORER_NODE_DATA,
			data : {
				"key" : zkPath
			},
			cache : false,
			dataType : 'json',
			success : function(data) {
				if (data.stat == '* not found * ') {
					console.warn('Unable to load KikConfig for ' + env + '/' + type);
					return;
				}

				kikConfigData = JSON.parse(data.str).data;
				renderKikConfigTable();
				fillKikConfigWithValues();
			}
		});
	}

	function renderKikConfigTable() {
		var sb = [];

		sb.push('<table>');
		sb.push('<thead>');
		sb.push('<tr>');

		sb.push('<td>');
		sb.push('Name')
		sb.push('</td>');

		sb.push('<td>');
		sb.push('Value')
		sb.push('</td>');

		sb.push('<td>');
		sb.push('Type')
		sb.push('</td>');

		sb.push('<td>');
		sb.push('Description')
		sb.push('</td>');

		sb.push('</tr>');
		sb.push('</thead>');
		for ( var k in kikConfigData) {
			var configData = kikConfigData[k];
			var elKey = k.replace(/\./g, '');

			sb.push('<tr>');

			// Name
			sb.push('<td class="kikconfig-name">');
			sb.push(k);
			sb.push('</td>');

			// Value
			sb.push('<td class="kikconfig-value">');
			switch (configData.type) {
			case 'Boolean':
				sb.push('<select class="config-field" id="');
				sb.push(elKey);
				sb.push('">');
				sb.push('<option value="null">(null)</option>');
				sb.push('<option value="false">False</option>');
				sb.push('<option value="true">True</option>');
				sb.push('</select>');
				break;
			case 'Long':
				sb.push('<input class="config-field" type="number" id="');
				sb.push(elKey);
				sb.push('" placeholder="(null)" />');
				break;

			default:
				sb.push('<input class="config-field" type="text" id="');
				sb.push(elKey);
				sb.push('"placeholder="(null)" />');
				break;
			}
			sb.push('<input type="button" class="config-button config-revert" value="X" />');
			sb.push('<input type="button" class="config-button config-save" value="&#10003;" />');

			sb.push('</td>');

			// Type
			sb.push('<td class="kikconfig-type">');
			sb.push(configData.type);
			sb.push('</td>');

			// Description
			sb.push('<td>');
			sb.push(configData.description);
			sb.push('</td>');

			sb.push('</tr>');
		}
		sb.push('</table>');
		$("#configTable").html(sb.join(''));
		$("#configTable").find("tr:even").addClass('even');

		for ( var k in kikConfigData) {
			var configData = kikConfigData[k];
			configData.key = k;
			var elKey = k.replace(/\./g, '');
			$('#' + elKey).data('config', configData);
		}

		$("#configTable").find('td').click(function() {
			$(".config-hl").removeClass('config-hl');
			var parentTr = $(this).parents('tr');
			parentTr.addClass('config-hl');
			parentTr.find('input[type=text], input[type=number], select').focus();
		});

		// Show the save/revert buttons when a change occurs:
		$('.config-field').focus(function(e) {
			$(".config-hl").removeClass('config-hl');
			var parentTr = $(this).parents('tr');
			parentTr.addClass('config-hl');
		}).bind('keyup change', function(e) {
			$(this).parents('tr').find('.config-button').show();
		});

		$('.config-revert').click(function() {
			var savedEl = $(this).parents('td').children().first();
			var configData = savedEl.data('config');
			fillKikConfigValue(configData.key);
		});

		$(".config-save").click(function() {
			var env = $("#configEnv").val();
			var type = $("#configType").val();

			var savedEl = $(this).parents('td').children().first();
			var configData = savedEl.data('config');
			var data = toBinary(savedEl.val());

			var localPath = '/' + env + '/config/' + type + '/default/' + configData.key;
			$.ajax({
				type : 'PUT',
				url : URL_EXPLORER_ZNODE_BASE + localPath,
				data : data,
				contentType : 'application/json',
				headers : {
					'netflix-user-name' : 'pwagner',
					'netflix-ticket-number' : '1',
					'netflix-reason' : '(hardcoded, the resource requires this)'
				},
				success : function(data) {
					if (data.succeeded) {
						fillKikConfigValue(configData.key);
						messageDialog("Success", "The change has been made.");
					} else {
						messageDialog("Error", data.message);
					}
				}
			});
		});

	}

	function fillKikConfigValue(k) {
		var env = $("#configEnv").val();
		var type = $("#configType").val();

		$.ajax({
			url : URL_EXPLORER_NODE_DATA,
			data : {
				"key" : '/' + env + '/config/' + type + '/default/' + k
			},
			cache : false,
			dataType : 'json',
			configAttr : k,
			success : function(data) {
				var elKey = '#' + this.configAttr.replace(/\./g, '');
				var el = $(elKey);
				var configData = $(elKey).data('config');

				var stat = data.stat;
				if (stat.indexOf("not found") > 0) {
					el.val(configData.type == 'Boolean' ? 'null' : '');
				} else {
					el.val(data.str);
				}
				el.parents('td').find('.config-button').hide();
				$('.config-hl').removeClass('config-hl');
			}
		});
	}

	function fillKikConfigWithValues() {
		var env = $("#configEnv").val();
		var type = $("#configType").val();

		for ( var k in kikConfigData) {
			fillKikConfigValue(k);
		}

		var zkPath = '/' + env + '/config/' + type + '/default';
		$.ajax({
			url : URL_EXPLORER_NODE,
			data : {
				"key" : zkPath
			},
			cache : false,
			dataType : 'json',
			configAttr : k,
			success : function(data) {
				for ( var i = 0; i < data.length; i++) {
					var configKey = data[i].title;
					if (configKey.indexOf('* Exception *') > 0) {
						console.warn('Error fetching ' + zkPath + '.');
					}
					var elKey = configKey.replace(/\./g, '');
					if (!$('#' + elKey).length) {
						console.log('where did ' + configKey + ' come from.');
					}
				}
			}
		});
	}

	addKikConfigTab();

	fetchKikConfig();
	$("#configEnv").change(fetchKikConfig);
	$("#configType").change(fetchKikConfig);

});
