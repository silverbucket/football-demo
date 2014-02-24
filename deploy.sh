grunt &&
cp -r articles/ build/ &&
cp atom.xml build/ &&
git add build/ &&
git commit -m "deploy" . &&
git push &&
git subtree push --prefix build/ 5apps master
