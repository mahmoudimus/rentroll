DIRS = initraflow validation actions f2ra flow2ra
RLNK =

raflow:
	for dir in $(DIRS); do make -C $$dir;done
	@echo "*** Completed in test/raflow ***"

clean:
	for dir in $(DIRS); do make -C $$dir clean;done
	@echo "*** CLEAN completed in test/raflow ***"

relink:
	for dir in $(RLNK); do make -C $$dir relink;done
	@echo "*** RELINK completed in ${THISDIR} ***"

test:
	for dir in $(DIRS); do make -C $$dir test;done
	@echo "*** TEST completed in test/raflow ***"

package:
	for dir in $(DIRS); do make -C $$dir package;done
	@echo "*** PACKAGING COMPLETE IN test/raflow ***"

secure:
	for dir in $(DIRS); do make -C $${dir} secure;done
	@rm -f config.json confdev.json confprod.json
