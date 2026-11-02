import zipfile, os
out = 'deploy/voyager-latest.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('dist'):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, 'dist').replace(os.sep, '/'))
print(out, round(os.path.getsize(out) / 1048576, 1), 'MB', len(zipfile.ZipFile(out).namelist()), 'files')
