publish:
	-rm -rf Monu.app Monu.zip # prevent duplicates in the final bundle
	npm run build
	@# ditto creates a much better compressed zip file compared to the zip command
	@# these flags come from ditto's man page on how to create an archive in the
	@# same manner as Finder's compress option
	ditto -c -k --sequesterRsrc --keepParent Monu.app Monu.zip
	npm run publish
.PHONY: publish
