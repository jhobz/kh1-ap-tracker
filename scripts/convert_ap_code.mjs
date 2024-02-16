import fs from 'fs'

const importFile = (from) => {
    const infile = fs.readFileSync(from, 'utf8')
    const data = JSON.parse(infile)
    return data
}

function writeItemFiles(itemData) {
    let luaOutput = ''
    let jsonOutput = []
    Object.keys(itemData).forEach((khType) => {
        itemData[khType].forEach(({code, name, tracker_type, quantity}) => {
            luaOutput += `[${code}] = {"${name.replace(/ /g, '').toLowerCase()}, ${tracker_type}"},\n`

            let item
            switch(tracker_type) {
                case 'toggle':
                    item = {
                        name,
                        type: tracker_type,
                        codes: name.replace(/ /g, '').toLowerCase()
                    }
                    break
                case 'progressive':
                    const stages = []
                    for (let i = 0; i < quantity; i++) {
                        stages.push({
                            codes: name.replace(/ /g, '').toLowerCase() + '_' + i,
                            inherit_codes: false
                        })
                    }
                    item = {
                        name,
                        type: tracker_type,
                        allow_disabled: true,
                        initial_stage_idx: 0,
                        stages
                    }
                    break
                case 'consumable':
                    item = {
                        name,
                        type: tracker_type,
                        min_quantity: 0,
                        max_quantity: quantity,
                        codes: name.replace(/ /g, '').toLowerCase()
                    }
                    break
            }
            jsonOutput.push(item)
        })
    })
    luaOutput = `ITEM_MAPPING = {\n${luaOutput.substring(0, luaOutput.length - 2)}\n}`
    fs.writeFileSync('autotracking/item_mapping.lua', luaOutput)
    fs.writeFileSync('../items/items.json', JSON.stringify(jsonOutput))
}

function writeLocationFiles(locData) {
    try {
        writeLocationCodesFile(locData)
        writeWorldFiles(locData)
    } catch (e) {
        console.error('Something went wrong', e)
    }
}

function writeLocationCodesFile(locData) {
    let luaOutput = ''
    Object.keys(locData).forEach((khType) => {
        locData[khType].forEach(({code, world, room, name}) => {
            luaOutput += `[${code}] = {"@${world}/${room}/${name}"},\n`
        })
    })
    luaOutput = `LOCATION_MAPPING = {\n${luaOutput.substring(0, luaOutput.length - 2)}\n}`
    fs.writeFileSync('autotracking/location_mapping.lua', luaOutput)
}

function writeWorldFiles(locData) {
    const worldObjects = generateTrackerLocations(locData)
    Object.keys(worldObjects).forEach((world) => {
        const filename = '../locations/' + world.replace(/ /g, '').toLowerCase() + '.json'
        fs.writeFileSync(filename, JSON.stringify([worldObjects[world]]))
    })
}

/**
 * 
 * @param {object} locationData structured as follows:
 *  {
 *      [KHLocationType]: [
 *          { world: "Traverse Town", "room": "1st Distrct", "name": "Candle Puzzle Chest", "code": "0211" },
 *          ...
 *      ],
 *      ...
 *  }
 * @returns
 */
function generateTrackerLocations(locationData) {
    const worlds = [
        'Traverse Town',
        'Wonderland',
        'Deep Jungle',
        'Agrabah',
        'Monstro',
        'Atlantica',
        'Halloween Town',
        'Olympus Coliseum',
        'Neverland',
        'Hollow Bastion',
        'End of the World',
        'Levels'
    ]
    const worldObjects = {}

    worlds.forEach((world) => {
        worldObjects[world] = {
            name: world,
            children: []
        }
    })

    // The tracker doesn't (currently) care much about the KHLocationType, so we need to flatten the array
    let locations = []
    Object.keys(locationData).forEach((khLocationType) => {
        locations.push(...locationData[khLocationType])
    })
    console.log(locations)

    locations.forEach((location) => {
        // Victory location is not necessary for tracker
        if (location.name === 'Victory') {
            return
        }

        const world = location.world
        const rooms = worldObjects[world].children

        // Check if the room has been added as a region yet
        if (rooms.filter((room) => room.name === location.room).length <= 0) {
            rooms.push({
                name: location.room,
                sections: [],
                'map_locations': [{
                    map: world.replace(/ /g, '').toLowerCase(),
                    // These numbers have to be hardcoded after conversion, so this is just to separate them visually
                    x: 50 * rooms.length,
                    y: 355
                }]
            })
        }

        // Add the check as a section
        const room = rooms.filter((r) => r.name === location.room)[0]
        const checkInfo = { name: location.name }
        room.sections.push({
            ...checkInfo,
            // Some access rules will still need to be added by hand, but this at least includes all of the worlds
            'access_rules': [world.replace(/ /g, '').toLowerCase()],
        })
    })

    return worldObjects
}

const itemData = importFile('items_from_ap.json')
const locData = importFile('locations_from_ap.json')

try {
    writeItemFiles(itemData)
    writeLocationFiles(locData)
    console.log('Successfully output all codes')
} catch (e) {
    console.error('Something went wrong', e)
}