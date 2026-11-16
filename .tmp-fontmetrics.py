import struct, sys, os

def read_metrics(path):
    with open(path,'rb') as f:
        data = f.read()
    if len(data) < 12: return None
    num_tables = struct.unpack('>H', data[4:6])[0]
    tables = {}
    for i in range(num_tables):
        off = 12 + i*16
        tag = data[off:off+4].decode('latin1')
        checksum, offset, length = struct.unpack('>III', data[off+4:off+16])
        tables[tag] = (offset, length)
    head = tables.get('head'); hhea = tables.get('hhea'); os2 = tables.get('OS/2')
    if not head or not hhea: return None
    upem = struct.unpack('>H', data[head[0]+18:head[0]+20])[0]
    ascent, descent, linegap = struct.unpack('>hhh', data[hhea[0]+4:hhea[0]+10])
    result = {'upem': upem, 'hhea_ascent': ascent, 'hhea_descent': descent, 'linegap': linegap}
    if os2:
        o = os2[0]
        version = struct.unpack('>H', data[o:o+2])[0]
        typo_asc, typo_desc, typo_gap = struct.unpack('>hhh', data[o+68:o+74])
        win_asc, win_desc = struct.unpack('>HH', data[o+74:o+78])
        result.update({'os2_typo_ascent': typo_asc, 'os2_typo_descent': typo_desc,
                       'os2_win_ascent': win_asc, 'os2_win_descent': win_desc, 'os2_version': version})
    return result

for name in ['re2014a.ttf','rg2014b.ttf','rg2014c.ttf','misans_semibold.ttf']:
    p = os.path.join('public','fonts','traffic',name)
    print(name, read_metrics(p))
